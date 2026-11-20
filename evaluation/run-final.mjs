import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exercise} from './workbench.mjs';
import {grade} from './criteria.mjs';
import {createApiFixture, exerciseWorker, fixtureKey, fixtureSecret, fixtureNote} from './api-fixture.mjs';
import {exerciseChat} from './chat-workbench.mjs';
import {advisoryText} from '../dist/advisory.js';
import {agentNote} from '../dist/engine.js';
import {metrics as productionMetrics, manualEvidenceMarkdown} from './live-support.mjs';

if (process.argv.length !== 2) throw new Error('Usage: node evaluation/run-final.mjs');
const load = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const legacy = await load('cases.json');
const apiCases = await load('final-cases.json');
const liveCases = await load('live-cases.json');
const guardCases = await load('advisory-cases.json');
const optionalLoad = async name => {
  try { return await load(name); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const manualVerification = await optionalLoad('manual-results.json');
const productionEvidence = await optionalLoad('live-results.json');
const productionAutomation = productionEvidence ? {
  source: 'evaluation/live-results.json', summary: productionMetrics(productionEvidence.runs)
} : null;
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
    ['advisory-system-instruction', google.every(call =>
      call.body.systemInstruction.parts[0].text.includes('RiskPilot is advisory only.'))],
    ['timeouts-attached', calls.filter(call => ['google', 'verification'].includes(call.kind)).every(call => call.hasTimeout)]
  ];
}

async function evaluate(testCase) {
  if (testCase.surface === 'advisory' || testCase.surface === 'local-note') {
    let output = {note: advisoryText(testCase.text)};
    if (testCase.surface === 'local-note') {
      const previousModel = globalThis.LanguageModel;
      let destroyed = false;
      let promptHasTimeout = false;
      let advisoryInstructionPresent = false;
      try {
        globalThis.LanguageModel = {create: async options => {
          advisoryInstructionPresent = options.initialPrompts[0].content.includes('RiskPilot is advisory only.');
          return {
            prompt: async (input, settings) => {
              promptHasTimeout = settings.signal instanceof AbortSignal;
              return testCase.text;
            },
            destroy() { destroyed = true; }
          };
        }};
        output = {note: await agentNote('Reviewer', 'Review this synthetic finding.', {}), destroyed,
          promptHasTimeout, advisoryInstructionPresent};
      } finally {
        globalThis.LanguageModel = previousModel;
      }
    }
    const checks = testCase.expect.unchanged
      ? [['safe-advice-preserved', output.note === testCase.text]]
      : [
        ['unsupported-claim-removed', !output.note.includes(testCase.text)],
        ['truthful-advisory-replacement', output.note.startsWith('RiskPilot provides advisory guidance only.')
          && output.note.includes('cannot patch systems') && output.note.includes('modify infrastructure')],
        ['guard-idempotent', advisoryText(output.note) === output.note]
      ];
    if (testCase.surface === 'local-note') checks.push(['local-model-lifecycle-preserved',
      output.destroyed && output.promptHasTimeout && output.advisoryInstructionPresent]);
    return {output, checks};
  }
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
    if (testCase.expect.advisoryReplacement) checks.push(['server-action-claim-blocked',
      output.result.note?.startsWith('RiskPilot provides advisory guidance only.')
      && !output.result.note.includes(testCase.options.note)]);
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
    if (testCase.expect.advisoryReplacement) checks.push(['browser-action-claim-blocked',
      output.turns.some(turn => turn.speaker.includes('Gemini') && turn.text.startsWith('RiskPilot provides advisory guidance only.'))
      && output.turns.filter(turn => turn.speaker !== 'You').every(turn =>
        !turn.text.includes(testCase.options.rawBridgeNote ?? testCase.options.note))]);
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
    const bridgeCalls = api.calls.filter(call => call.kind === 'bridge');
    checks.push(['risk-note-request-schema', bridgeCalls.length === expectedGenerationCalls && bridgeCalls.every(call =>
      call.status === 200 && Object.keys(call.body).sort().join(',') === 'cve,score,token'
      && call.body.cve === base.input.cve && call.body.score === 7.5)]);
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

const cases = [...legacy.map(item => ({...item, id: 'regression-' + item.id, surface: 'legacy'})), ...apiCases, ...guardCases];
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
const sourceFiles = ['dist/app.js', 'dist/chat.js', 'dist/gemini.js', 'dist/engine.js', 'dist/advisory.js', 'worker/index.mjs', 'worker/wrangler.toml'];
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
  livePlanNote: 'The live field and live run entries are original plan placeholders. Observed production attempts and owner-reported manual checks are separate evidence, never substituted for these slots.',
  productionAutomation, manualVerification,
  limitations: [
    'External HTTP, Google responses, Turnstile and limiter decisions are test doubles. Tests execute actual application, bridge and Worker code.',
    'No live model inference or refusal quality is measured by offline tests.',
    'Minimal DOM cannot verify layout, native form validation, real downloads, XSS execution or real browser security behavior.',
    'Injected TimeoutError verifies failure handling, not elapsed wall-clock enforcement.',
    'Injected unsupported model claims test the application guard, not the frequency of real model hallucinations. English-language pattern checks can miss paraphrases or overblock benign quoted/conditional text.',
    'Production Playwright verification was blocked by the unchanged Turnstile gate. No Worker/Gemini defect was demonstrated. Preserve all three failed attempts.',
    'Owner-reported manual checks are separate from quantitative live performance. Confirm whether the rubric requires all 10 live cases three times; no live pass@1 or pass^3 is inferred from the short checklist.'
  ],
  failures: failures.map(({caseId, run, failureReason}) => ({caseId, run, failureReason})), runs
};
await writeFile(new URL('final-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
const pct = value => value === null ? 'Unverified' : (100 * value).toFixed(1) + '%';
const markdown = [
  '# RiskPilot final evaluation',
  '', 'Generated ' + result.generatedAt,
  '', 'Automated final-system evaluation executes actual app, Gemini bridge and Worker code against synthetic external responses and synthetic credentials. Owner-reported manual live verification is shown separately.',
  '', '| Cohort | Cases | Trials | Pass | Fail | Manual required | pass@1 | pass^3 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ...[['Automated offline final system', result.offline]].map(([label, s]) =>
    '| ' + [label, s.cases, s.trials, s.passed, s.failed, s.manualRequired, pct(s['pass@1']), pct(s['pass^3'])].join(' | ') + ' |'),
  '', 'Coverage includes the current request schema, security guardrails, Milestone II regressions, edge/adversarial cases and model-output validation. Offline metrics do not measure genuine Gemini quality.',
  '', '## Production live automation', '',
  ...(productionAutomation ? [
    'Saved production attempts: ' + productionAutomation.summary.executed + ' executed; '
      + productionAutomation.summary.passed + ' passed; ' + productionAutomation.summary.failed + ' failed; '
      + (productionAutomation.summary.totalSlots - productionAutomation.summary.executed) + ' unrun.',
    'Production pass@1: ' + pct(productionAutomation.summary['pass@1']) + '; pass^3: ' + pct(productionAutomation.summary['pass^3']) + '.'
  ] : ['No production attempts recorded.']), '',
  'The three saved Playwright attempts stopped during browser verification with no Worker/Gemini response; trial 3 directly confirms zero Worker POSTs. Earlier attempts have matching fallback/timing but lack request-event diagnostics. No Worker or Gemini defect was demonstrated. All three remain failures.', '',
  'Turnstile is an unchanged production security gate preventing this automated path. Cloudflare documents that automated browsers can be blocked; production Turnstile automation is not a supported verification path here. The precise provider challenge cause remains unknown. Do not weaken, bypass or replace the control.', '',
  'Evidence: [live-results.md](live-results.md), live-results.json and [Cloudflare testing guidance](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).',
  '', '## Manual live verification', '', ...manualEvidenceMarkdown(manualVerification),
  '', '## Formulas', '', ...Object.entries(result.formulas).map(([name, formula]) => '- ' + name + ': ' + formula),
  '', '## Trial results', '', '| Case | Run | Status | Failed criteria |',
  '| --- | ---: | --- | --- |',
  ...runs.filter(run => run.surface !== 'live').map(run => '| ' + [run.caseId, run.run, run.status, run.criteriaFailed.join(', ') || '-'].join(' | ') + ' |'),
  '', '## Original live-plan placeholders', '',
  'The 30 manual-required entries in final-results.json are the offline runner\'s plan, not executed production outcomes. Actual production attempts remain in live-results.json. Manual verification does not regrade either cohort.',
  '', '## Failure analysis', '',
  ...(failures.length ? failures.map(run => '- ' + run.caseId + ', run ' + run.run + ': ' + run.failureReason) : ['No observed offline failures in this run.']),
  '', 'Previous baseline b6cc09e had 15 failed trials. The request-format and unsupported-claim criteria remain in this suite. Current results above determine whether those defects are resolved.',
  '', 'Assessment requests now use the object schema, with real bridge/Worker validation exercised before mocked Google inference. Unsupported-action responses are checked by server and browser guards. No actual patch or external system action is performed.',
  '', '## Observed limitations', '', ...result.limitations.map(item => '- ' + item),
  '', '## Manual completion', '',
  'See evaluation/MANUAL.md and manual-results.json for owner-reported completed checks. Recommendation: SHIP WITH GATES, retaining production Turnstile, advisory-only permissions and human approval. Provider logging/retention/billing and instructor acceptance of offline versus repeated live evidence remain owner responsibilities. No deployment is authorized by this report.',
  ''
].join('\n');
await writeFile(new URL('final-results.md', import.meta.url), markdown);
console.log(JSON.stringify({offline: result.offline, live: result.live}));
if (failures.length) process.exitCode = 1;
