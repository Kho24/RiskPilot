import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exercise} from './workbench.mjs';
import {grade} from './criteria.mjs';
import {createApiFixture, exerciseWorker, fixtureKey, fixtureSecret, fixtureNote} from './api-fixture.mjs';
import {exerciseChat} from './chat-workbench.mjs';

if (process.argv.length !== 2) throw new Error('Usage: node evaluation/run-final.mjs');
const load = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const legacy = await load('cases.json');
const apiCases = await load('final-cases.json');
const liveCases = await load('live-cases.json');
const attempts = 3;
const runs = [];

function transportChecks(calls, maxGenerationCalls = 1) {
  const google = calls.filter(call => call.kind === 'google');
  return [
    ['fixed-network-destinations', calls.every(call => {
      const url = new URL(call.url);
      return ['riskpilot-api.kho24.workers.dev', 'challenges.cloudflare.com',
        'generativelanguage.googleapis.com', 'raw.githubusercontent.com', 'services.nvd.nist.gov'].includes(url.hostname);
    })],
    ['no-model-tools-or-auto-retry', google.length <= maxGenerationCalls && google.every(call =>
      !Object.hasOwn(call.body, 'tools') && !Object.hasOwn(call.body, 'toolConfig'))],
    ['credentials-excluded-from-model-prompt', google.every(call =>
      !JSON.stringify(call.body).includes(fixtureKey) && !JSON.stringify(call.body).includes(fixtureSecret)
      && !JSON.stringify(call.body).includes('EVALUATION_ONLY_TOKEN'))],
    ['timeouts-attached', calls.filter(call => ['google', 'verification'].includes(call.kind)).every(call => call.hasTimeout)]
  ];
}

async function evaluate(testCase) {
  if (testCase.surface === 'legacy') {
    const output = await exercise(testCase);
    return {output, checks: grade(testCase, output)};
  }
  if (testCase.surface === 'worker') {
    const generated = structuredClone(testCase);
    if (generated.generatedInput === 'body-too-large') generated.rawBody = 'x'.repeat(4097);
    if (generated.generatedInput === 'chat-too-long') generated.body = {message: 'x'.repeat(301), token: 'EVALUATION_ONLY_TOKEN'};
    if (generated.generatedInput === 'long-output') generated.options = {note: 'x'.repeat(2000)};
    const output = await exerciseWorker(generated);
    const google = output.calls.filter(call => call.kind === 'google');
    const checks = [
      ['http-status', output.status === testCase.expect.http],
      ['expected-google-call-count', google.length === testCase.expect.googleCalls],
      ['no-store', output.cacheControl === 'no-store'],
      ['no-secret-in-response', !JSON.stringify(output.result).includes(fixtureKey)
        && !JSON.stringify(output.result).includes(fixtureSecret)],
      ...transportChecks(output.calls)
    ];
    if (testCase.expect.http === 200) {
      checks.push(['plain-text-response', typeof output.result.note === 'string' && output.result.note.length > 0]);
      checks.push(['thoughts-filtered', !output.result.note?.includes('EVALUATION_INTERNAL_THOUGHT')]);
    }
    if (testCase.action === 'risk-note' && testCase.expect.http === 200) {
      const payload = JSON.parse(google[0].body.contents[0].parts[0].text);
      checks.push(['risk-note-minimal-payload', Object.keys(payload).sort().join(',') === 'cve,cvss'
        && payload.cve === testCase.body.cve && payload.cvss === testCase.body.score]);
      checks.push(['risk-note-output-cap', output.result.note.length <= 600]);
    }
    if (testCase.expect.outputLength) checks.push(['output-character-cap', output.result.note?.length === testCase.expect.outputLength]);
    return {output, checks};
  }
  if (testCase.surface === 'chat') {
    const output = await exerciseChat(testCase);
    const google = output.calls.filter(call => call.kind === 'google');
    const checks = [
      ['expected-google-call-count', google.length === testCase.expect.googleCalls],
      ['controls-restored', output.controlsEnabled && output.formVisible],
      ['expected-success-or-fallback', testCase.expect.status === 'success'
        ? output.status === 'Gemini responded.' && output.turns.some(turn => turn.speaker.includes('Gemini'))
        : output.status.includes('unavailable') && output.turns.every(turn => !turn.speaker.includes('Gemini'))],
      ['credentials-excluded-from-model-prompt', google.every(call =>
        !JSON.stringify(call.body).includes(fixtureKey) && !JSON.stringify(call.body).includes(fixtureSecret))],
      ['fixed-google-destination', google.every(call => new URL(call.url).hostname === 'generativelanguage.googleapis.com')],
      ['no-tools-configured', google.every(call => !Object.hasOwn(call.body, 'tools'))]
    ];
    if (testCase.messages) {
      const payloads = google.map(call => JSON.parse(call.body.contents[0].parts[0].text));
      checks.push(['current-message-only', payloads.length === 2 && payloads[1].message === testCase.messages[1]
        && !JSON.stringify(google[1].body).includes('EVAL_PRIVATE_FIRST')]);
    } else {
      checks.push(...transportChecks(output.calls));
    }
    if (testCase.expect.literalOutput) {
      checks.push(['model-output-is-literal-text', output.turns.some(turn => turn.text === testCase.options.note)
        && output.turns.every(turn => turn.links.length === 0)]);
    }
    if (testCase.expect.rejectUnsupportedClaim) {
      // Fault injection: prove whether a false model claim is detected at the
      // application boundary. This is not an estimate of model hallucination rate.
      checks.push(['unsupported-model-claim-not-presented', output.turns.every(turn =>
        !turn.text.includes('I patched your production server'))]);
    }
    return {output, checks};
  }
  const base = structuredClone(legacy.find(item => item.id === testCase.base));
  if (!base) throw new Error('Unknown base case ' + testCase.base);
  base.input = {...base.input, ...testCase.input};
  if (testCase.expect.approval) base.expect.approval = testCase.expect.approval;
  const api = createApiFixture(testCase.options);
  const output = await exercise(base, api);
  output.apiCalls = api.calls;
  const google = api.calls.filter(call => call.kind === 'google');
  const expectedGenerationCalls = testCase.expect.approval === 'approve-reset' ? 2 : 1;
  const checks = [
    ['pipeline-completed', output.stages.every(stage => stage === 'Complete') && output.remediation.length > 0 && output.reviewer.length > 0],
    ['draft-and-export-blocked', output.approval.initial === 'Draft / Pending Human Review'
      && output.approval.initiallyDisabled && !output.approval.exportedBeforeApproval],
    ...transportChecks(api.calls, expectedGenerationCalls)
  ];
  if (testCase.expect.gemini) {
    checks.push(['gemini-generated-through-real-bridge-worker', google.length === expectedGenerationCalls
      && output.geminiNote === fixtureNote && output.geminiStatus === 'Gemini responded.']);
    checks.push(['only-cve-and-score-reach-google', google.length === expectedGenerationCalls && google.every(call => {
      const payload = JSON.parse(call.body.contents[0].parts[0].text);
      return Object.keys(payload).sort().join(',') === 'cve,cvss'
        && payload.cve === base.input.cve && payload.cvss === 7.5;
    })]);
    checks.push(['expected-risk-retained', output.risk === 'High' && output.cvss === 7.5]);
  } else {
    checks.push(['no-model-without-verified-score', google.length === 0 && output.geminiNote === null
      && output.cvss === null && output.risk === 'Undetermined']);
  }
  if (testCase.expect.missing) {
    checks.push(['reviewer-flags-missing-context', testCase.expect.missing.every(label =>
      output.context[label] === 'Unknown' && output.reviewer.some(item => item.toLowerCase().includes(label.toLowerCase())))]);
  }
  if (testCase.expect.sourceRequests) {
    const sourceCalls = api.calls.filter(call => call.kind === 'source');
    checks.push(['research-retry-hard-cap', sourceCalls.length === testCase.expect.sourceRequests
      && sourceCalls.every(call => call.method === 'GET' && call.hasTimeout)]);
  }
  if (testCase.expect.approval === 'approve-reset') {
    checks.push(['approval-enables-export', output.approval.exportedAfterDecision && output.approval.exportedApprovedAdvisory]);
    checks.push(['new-run-clears-approval', output.approval.newStatus === 'Draft / Pending Human Review'
      && output.approval.newDownloadDisabled && !output.approval.exportedDuringNewRun && !output.approval.exportedAfterReset]);
  } else if (testCase.expect.approval) {
    checks.push(['decision-blocks-export', !output.approval.exportedAfterDecision && output.approval.disabledAfterDecision]);
  }
  return {output, checks};
}

const cases = [...legacy.map(item => ({...item, id: 'regression-' + item.id, surface: 'legacy'})), ...apiCases];
for (const testCase of cases) {
  for (let run = 1; run <= attempts; run++) {
    let output = null;
    let checks;
    let failureReason = null;
    try {
      ({output, checks} = await evaluate(testCase));
    } catch (error) {
      checks = [['execution', false]];
      failureReason = error.message;
    }
    const criteriaPassed = checks.filter(([, pass]) => pass).map(([name]) => name);
    const criteriaFailed = checks.filter(([, pass]) => !pass).map(([name]) => name);
    runs.push({
      caseId: testCase.id, surface: testCase.surface, kind: testCase.kind ?? 'normal', run,
      status: criteriaFailed.length ? 'fail' : 'pass', pass: criteriaFailed.length === 0,
      criteriaPassed, criteriaFailed,
      failureReason: failureReason ?? (criteriaFailed.length ? criteriaFailed.join(', ') : null), output
    });
  }
  console.log(testCase.id + ': ' + runs.slice(-attempts).map(run => run.status).join(', '));
}

for (const testCase of liveCases) {
  for (let run = 1; run <= attempts; run++) {
    runs.push({
      caseId: testCase.id, surface: 'live', kind: testCase.kind ?? 'normal', run,
      status: 'manual-required', pass: null, criteriaPassed: [], criteriaFailed: [],
      failureReason: null,
      limitation: 'Live browser, real Turnstile and deployed Gemini response require human verification. No deployment secret was read or API token bypassed.',
      expectedCriteria: testCase.criteria, output: null
    });
  }
}
const summarize = selected => {
  const ids = [...new Set(selected.map(run => run.caseId))];
  const pending = selected.some(run => run.pass === null);
  return {
    cases: ids.length, trials: selected.length,
    passed: selected.filter(run => run.pass === true).length,
    failed: selected.filter(run => run.pass === false).length,
    manualRequired: selected.filter(run => run.pass === null).length,
    'pass@1': pending ? null : selected.filter(run => run.run === 1 && run.pass).length / ids.length,
    'pass^3': pending ? null : ids.filter(id => selected.filter(run => run.caseId === id && run.pass).length === 3).length / ids.length
  };
};
const sourceFiles = ['dist/app.js', 'dist/chat.js', 'dist/gemini.js', 'dist/engine.js', 'worker/index.mjs', 'worker/wrangler.toml'];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async name => [
  name, createHash('sha256').update(await readFile(new URL('../' + name, import.meta.url))).digest('hex')
])));
const failures = runs.filter(run => run.pass === false);
const result = {
  generatedAt: new Date().toISOString(), attemptsPerCase: attempts, sourceHashes,
  mode: 'offline-current-api-integration-with-explicit-live-pending',
  formulas: {
    'pass@1': 'Cases whose first trial passes / number of cases in the named cohort.',
    'pass^3': 'Cases whose three trials all pass / number of cases in the named cohort.',
    pending: 'Metrics are null for any cohort with manual-required trials. Pending trials never count as passes. Definitions remain provisional pending instructor confirmation.'
  },
  summary: summarize(runs), offline: summarize(runs.filter(run => run.surface !== 'live')),
  live: summarize(runs.filter(run => run.surface === 'live')),
  limitations: [
    'External HTTP, Google responses, Turnstile and limiter decisions are test doubles. Tests execute actual application, bridge and Worker code.',
    'No live model inference or refusal quality is measured by offline tests.',
    'Minimal DOM cannot verify layout, native form validation, real downloads, XSS execution or real browser security behavior.',
    'Injected TimeoutError verifies failure handling, not elapsed wall-clock enforcement.',
    'Injected unsupported model claim tests the absence of an output validator, not the frequency of real model hallucinations.',
    'Live cases require three fresh browser runs each, checked against live-cases.json. Recorded latency, status, outputs and source evidence must be reviewed by a human.'
  ],
  failures: failures.map(({caseId, run, failureReason}) => ({caseId, run, failureReason})), runs
};
await writeFile(new URL('final-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
const pct = value => value === null ? 'Unverified' : (100 * value).toFixed(1) + '%';
const markdown = [
  '# RiskPilot final evaluation',
  '', 'Generated ' + result.generatedAt,
  '', 'Actual app + Gemini bridge + Worker exercised with synthetic external responses and synthetic credentials. No live Gemini success is claimed.',
  '', '| Cohort | Cases | Trials | Pass | Fail | Manual required | pass@1 | pass^3 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ...[['Offline integration', result.offline], ['Live Gemini', result.live], ['All scheduled', result.summary]].map(([label, s]) =>
    '| ' + [label, s.cases, s.trials, s.passed, s.failed, s.manualRequired, pct(s['pass@1']), pct(s['pass^3'])].join(' | ') + ' |'),
  '', '## Formulas', '', ...Object.entries(result.formulas).map(([name, formula]) => '- ' + name + ': ' + formula),
  '', '## Trial results', '', '| Case | Run | Status | Failed criteria |',
  '| --- | ---: | --- | --- |',
  ...runs.map(run => '| ' + [run.caseId, run.run, run.status, run.criteriaFailed.join(', ') || '—'].join(' | ') + ' |'),
  '', '## Failure analysis', '',
  ...failures.map(run => '- ' + run.caseId + ', run ' + run.run + ': ' + run.failureReason),
  '', 'Assessment failures: the real caller passes positional arguments to a bridge that expects an object. Worker validation returns 400 before Google. Approval and rules output are graded independently and remain reviewable.',
  '', 'Unsupported claim failure: an injected false model statement is displayed as plain text. The prompt discourages such claims, but application code does not validate them. No actual patch or external action occurred.',
  '', '## Observed limitations', '', ...result.limitations.map(item => '- ' + item),
  '', '## Manual completion', '',
  'Use evaluation/live-cases.json and evaluation/MANUAL.md. Preserve these offline results. Save real observations separately. Do not label fallback responses as successful Gemini trials.',
  ''
].join('\n');
await writeFile(new URL('final-results.md', import.meta.url), markdown);
console.log(JSON.stringify({offline: result.offline, live: result.live}));
if (failures.length) process.exitCode = 1;
