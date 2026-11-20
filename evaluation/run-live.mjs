import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createInterface} from 'node:readline/promises';
import {stdin, stdout} from 'node:process';
import {candidate, preflight, newSession, saveSession, hash, applyObservation, reviewTrial, redact, publicSite, pendingTrials} from './live-support.mjs';
import {observeTrial} from './live-browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('./', import.meta.url);
const dataset = JSON.parse(await readFile(new URL('live-cases.json', directory), 'utf8'));
const mode = process.argv[2];
const args = process.argv.slice(3);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  if (!['--worker-version', '--browser', '--limit'].includes(args[index]) || !args[index + 1]) throw new Error('Unknown or incomplete option');
  options[args[index].slice(2)] = args[index + 1];
}
if (!['--prepare', '--check', '--run', '--review'].includes(mode)) {
  console.log('Usage: node evaluation/run-live.mjs --prepare | --check | --run --worker-version VERIFIED_ID [--browser chrome|msedge] [--limit 1] | --review');
  process.exitCode = 2;
} else {
  await main().catch(error => {
    console.error(redact(error.message).slice(0, 800));
    process.exitCode = 2;
  });
}

async function main() {
  const trialLimit = options.limit === undefined ? 30 : Number(options.limit);
  pendingTrials([], trialLimit); // Reject invalid limits before network or paid calls.
  const snapshot = await candidate(root);
  let session;
  try { session = JSON.parse(await readFile(new URL('live-results.json', directory), 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    session = newSession(dataset, snapshot);
  }
  if (session.datasetHash !== hash(JSON.stringify(dataset))) throw new Error('Dataset changed. Preserve existing live-results files before beginning a new cohort.');
  const captured = session.runs.some(run => run.timestamp);
  const sameSources = Object.entries(snapshot.files).every(([name, value]) =>
    value.sha256 === session.candidate.files[name]?.sha256);
  if (captured && !sameSources) throw new Error('Candidate changed. Preserve the existing live results and start a new cohort.');
  if (!captured) session.candidate = snapshot;
  if (mode === '--prepare') {
    await saveSession(session, directory);
    console.log('Prepared 30 trial slots. No live trial or API call was performed.');
    return;
  }
  if (mode === '--review') {
    await review(session);
    return;
  }
  if (mode === '--run' && session.runs.some(run => run.status === 'in-progress')) {
    throw new Error('An earlier attempt was interrupted and might have sent a request. Preserve the results and inspect that attempt before starting another cohort. It will not be replayed automatically.');
  }
  session.preflight = await preflight(snapshot);
  session.blockers = [];
  if (!session.preflight.passed) session.blockers.push('Deployed frontend could not be verified against committed candidate sources. See preflight checks. No new trial was started.');
  if (mode === '--check' || session.blockers.length) {
    await saveSession(session, directory);
    console.log(session.preflight.passed ? 'Frontend matches candidate. Worker identity still requires owner verification.'
      : 'BLOCKED: frontend version/reachability gate. No new trial was run.');
    for (const check of session.preflight.checks.filter(item => !item.matchesCandidate)) {
      console.log(check.file + ': ' + (check.error ?? ('HTTP ' + check.status + ', candidate hash mismatch')));
    }
    if (session.blockers.length) process.exitCode = 2;
    return;
  }
  await saveSession(session, directory);
  if (!options['worker-version']) throw new Error('Verify the active Worker source/version in Cloudflare, then supply --worker-version. Do not copy secret values.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(options['worker-version'])) {
    throw new Error('Use the Cloudflare Worker version UUID, never an API key or verification token.');
  }
  if (session.workerEvidence && session.workerEvidence.version !== options['worker-version'] && captured) {
    throw new Error('Worker version changed. Preserve existing results before starting a new cohort.');
  }
  if (!['chrome', 'msedge'].includes(options.browser ?? 'chrome')) throw new Error('Browser must be chrome or msedge.');
  const require = createRequire(new URL('browser/package.json', directory));
  let chromium;
  try {
    ({chromium} = require(process.env.RISKPILOT_PLAYWRIGHT_PATH || 'playwright'));
  } catch {
    session.blockers.push('Browser tooling is not installed. Use npm --prefix evaluation/browser install --ignore-scripts --package-lock=false.');
    await saveSession(session, directory);
    process.exitCode = 2;
    console.log(session.blockers.at(-1));
    return;
  }
  session.workerEvidence = {
    version: options['worker-version'], timestamp: new Date().toISOString(),
    expectedSourceSha256: snapshot.files['worker/index.mjs'].sha256,
    expectedConfigSha256: snapshot.files['worker/wrangler.toml'].sha256,
    expectedSharedAdvisorySha256: snapshot.files['dist/advisory.js'].sha256,
    method: 'Owner attests deployed source/config matches the candidate. Not programmatically verified.'
  };
  await saveSession(session, directory);
  const terminal = createInterface({input: stdin, output: stdout});
  let browser;
  let context;
  try {
    console.log('The next step makes real API requests using only the saved synthetic cases.');
    console.log('Keep the browser visible. Complete any Turnstile challenge yourself. Each request needs fresh verification.');
    console.log('No token replay, test keys, mocked responses, stealth flags or changed security settings are used.');
    const answer = await terminal.question('Ready to run at most ' + trialLimit + ' unstarted trial(s)? Type RUN: ');
    if (answer !== 'RUN') return;
    browser = await chromium.launch({channel: options.browser ?? 'chrome', headless: false});
    const noJs = await browser.newContext({javaScriptEnabled: false});
    session.browserChecks = [];
    try {
      for (const [path, form, message] of [
        ['', '#chat-form', '#chat-js-required'],
        ['assessment.html', '#assessment', '#assessment-js-required']
      ]) {
        const page = await noJs.newPage();
        await page.goto(publicSite + path, {waitUntil: 'domcontentloaded', timeout: 30000});
        session.browserChecks.push({
          path: path || 'index.html', timestamp: new Date().toISOString(),
          formHidden: !await page.locator(form).isVisible(),
          requiredMessageVisible: await page.locator(message).isVisible(),
          formActionNonePresent: (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content') ?? '').includes("form-action 'none'")
        });
        await page.close();
      }
    } finally {
      await noJs.close();
    }
    if (session.browserChecks.some(check => !check.formHidden || !check.requiredMessageVisible || !check.formActionNonePresent)) {
      session.blockers.push('No-JavaScript privacy checks failed. Owner review is required before live submissions.');
      process.exitCode = 2;
      return;
    }
    context = await browser.newContext({acceptDownloads: true});
    let lastSubmission = Date.parse(session.lastSubmissionAt ?? '') || 0;
    let activeTrial;
    const beforeSubmission = async () => {
      const waitMs = Math.max(0, 16000 - (Date.now() - lastSubmission));
      if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
      lastSubmission = Date.now();
      session.lastSubmissionAt = new Date(lastSubmission).toISOString();
      activeTrial.attemptStartedAt ??= new Date().toISOString();
      activeTrial.status = 'in-progress';
      await saveSession(session, directory);
      console.log('Submitting now. Solve Turnstile if it appears, within the application deadline.');
    };
    for (const trial of pendingTrials(session.runs, trialLimit)) {
      activeTrial = trial;
      const testCase = dataset.find(item => item.id === trial.caseId);
      console.log(testCase.id + ', trial ' + trial.run + '/3');
      try {
        const observation = await observeTrial(context, testCase, beforeSubmission);
        applyObservation(trial, testCase, observation);
      } catch (error) {
        const reason = redact(error.message).slice(0, 600);
        if (error.observation) {
          trial.timestamp = error.observation.timestamp;
          trial.evidence = error.observation;
          trial.pass = false;
          trial.status = 'fail';
          trial.criteriaFailed = ['browser-execution'];
          trial.failureReason = reason;
        }
        session.blockers.push('Browser verification needs owner attention: ' + reason);
        await saveSession(session, directory);
        process.exitCode = 2;
        break;
      }
      await saveSession(session, directory);
      console.log('Saved ' + trial.status + '.');
      if (trial.evidence.api.some(item => [403, 429, 503, 504].includes(item.status))
        || (trial.evidence.geminiStatus?.includes('unavailable') && testCase.id !== 'live-analysis-nonexistent')) {
        session.blockers.push('Verification, rate limit or upstream availability failed. Failed trial is preserved; remaining trials require owner attention. No automatic retry.');
        await saveSession(session, directory);
        process.exitCode = 2;
        break;
      }
    }
    console.log('Capture saved to evaluation/live-results.json and live-results.md. Use --review to judge remaining semantic criteria.');
  } catch (error) {
    session.blockers.push('Browser setup or execution stopped: ' + redact(error.message).slice(0, 600));
    process.exitCode = 2;
    console.error(session.blockers.at(-1));
  } finally {
    terminal.close();
    if (context) await context.close();
    if (browser) await browser.close();
    await saveSession(session, directory);
  }
}

async function review(session) {
  const terminal = createInterface({input: stdin, output: stdout});
  try {
    for (const testCase of dataset) {
      const trials = session.runs.filter(run => run.caseId === testCase.id && run.status === 'needs-review');
      if (!trials.length) continue;
      console.log('\n' + testCase.id);
      for (const trial of trials) {
        console.log('\nRUN ' + trial.run + '\n' + (trial.modelOutput ?? '(no model output)'));
        console.log('API: ' + trial.evidence.api.map(call => call.path + ' ' + call.status).join(', '));
        console.log('Remaining criteria:\n' + trial.reviewCriteria.map((text, index) => (index + 1) + '. ' + text).join('\n'));
      }
      let answers;
      do {
        answers = (await terminal.question('After reading these outputs, enter p (all shown criteria met), f (choose failures), or ? (defer) for runs '
          + trials.map(run => run.run).join(', ') + ', separated by spaces: ')).trim().split(/\s+/);
      } while (answers.length !== trials.length || answers.some(value => !['p', 'f', '?'].includes(value)));
      for (let index = 0; index < trials.length; index++) {
        const trial = trials[index];
        let decisions = trial.reviewCriteria.map(() => answers[index]);
        if (answers[index] === 'f') {
          const failed = (await terminal.question('Run ' + trial.run + ': enter failing criterion numbers separated by spaces: ')).trim().split(/\s+/).map(Number);
          if (!failed.length || failed.some(number => !Number.isInteger(number) || number < 1 || number > decisions.length)) {
            console.log('Invalid criterion numbers; this trial remains unreviewed.');
            continue;
          }
          decisions = decisions.map((_, criterion) => failed.includes(criterion + 1) ? 'f' : '?');
          console.log('Unselected criteria remain unverified. Review again to resolve them.');
        }
        reviewTrial(trial, trial.reviewCriteria, decisions);
      }
      await saveSession(session, directory);
    }
    console.log('Review saved. Unrun trials and deferred criteria remain unverified.');
  } finally {
    terminal.close();
  }
}
