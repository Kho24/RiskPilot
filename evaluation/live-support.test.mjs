import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {apiPayload, newSession, metrics, reviewTrial, applyObservation, hash, redact, pendingTrials, diagnoseLiveFailure, renderLiveMarkdown} from './live-support.mjs';
import {challengeBrowserFrameCount} from './live-browser.mjs';

// Unit checks for bookkeeping and redaction only. No Gemini response is
// simulated, no provider call is made and no live results file is written.
const cases = JSON.parse(await readFile(new URL('live-cases.json', import.meta.url)));
const snapshot = {commit: 'unit-only', files: {}};

test('ten real case definitions create exactly thirty unrun slots', () => {
  const plan = newSession(cases, snapshot);
  assert.equal(cases.length, 10);
  assert.equal(plan.runs.length, 30);
  for (const item of cases) assert.deepEqual(plan.runs.filter(run => run.caseId === item.id).map(run => run.run), [1, 2, 3]);
  assert.ok(plan.runs.every(run => run.pass === null && run.timestamp === null && run.status === 'not-run'));
});

test('unrun trials never create positive metrics', () => {
  const summary = metrics(newSession(cases, snapshot).runs);
  assert.equal(summary.executed, 0);
  assert.equal(summary.passed, 0);
  assert.equal(summary['pass@1'], null);
  assert.equal(summary['pass^3'], null);
});

test('verification tokens are omitted from request capture', () => {
  const captured = apiPayload(JSON.stringify({message: cases[0].input, token: 'UNIT_ONLY_DO_NOT_CAPTURE'}));
  assert.deepEqual(captured.fields, ['message']);
  assert.equal(JSON.stringify(captured).includes('UNIT_ONLY_DO_NOT_CAPTURE'), false);
});

test('payload capture preserves numeric score and CVE without credential fields', () => {
  const captured = apiPayload(JSON.stringify({cve: 'CVE-2021-44228', score: 10, token: 'UNIT_ONLY'}));
  assert.deepEqual(captured.fields, ['cve', 'score']);
  assert.equal(captured.score, 10);
  assert.equal(captured.cve, 'CVE-2021-44228');
});

test('generated credential-like text is redacted', () => {
  const synthetic = 'AIza' + 'x'.repeat(35);
  assert.equal(redact(synthetic), '[REDACTED_CREDENTIAL]');
});

test('an unrun trial cannot be approved by the reviewer', () => {
  const trial = newSession(cases, snapshot).runs[0];
  assert.throws(() => reviewTrial(trial, ['one'], ['p']), /unrun/);
});

test('human approval cannot override failed mechanical criteria', () => {
  const trial = {timestamp: 'unit-test-metadata', criteriaFailed: ['live-api-success'], criteriaPassed: []};
  reviewTrial(trial, ['Advice is accurate'], ['p']);
  assert.equal(trial.pass, false);
  assert.ok(trial.criteriaFailed.includes('live-api-success'));
});

test('deferred semantic judgment remains unverified', () => {
  const trial = {timestamp: 'unit-test-metadata', criteriaFailed: [], criteriaPassed: []};
  reviewTrial(trial, ['Advice is accurate'], ['?']);
  assert.equal(trial.pass, null);
  assert.equal(trial.status, 'needs-review');
});

test('semantic failures retain exact failed criteria and prior review history', () => {
  const trial = {timestamp: 'unit-test-metadata', criteriaFailed: [], criteriaPassed: []};
  reviewTrial(trial, ['No invented applicability'], ['f']);
  assert.equal(trial.pass, false);
  assert.match(trial.failureReason, /No invented applicability/);
  reviewTrial(trial, ['No invented applicability'], ['p']);
  assert.equal(trial.semanticReviewHistory.length, 1);
  assert.deepEqual(trial.semanticReviewHistory[0].decisions, ['f']);
});

test('missing API output cannot become a successful live Gemini trial', () => {
  const trial = newSession(cases, snapshot).runs[0];
  applyObservation(trial, cases[0], {
    timestamp: 'unit-test-metadata', api: [], source: [], modelOutput: null,
    geminiStatus: 'Gemini unavailable. Using the built-in workflow.',
    urlUnchanged: true, collectorRequested: false, credentialLikeOutput: false
  });
  assert.equal(trial.pass, false);
  assert.ok(trial.criteriaFailed.includes('live-api-success'));
});

test('case-level formulas count all three runs rather than any one success', () => {
  const plan = newSession(cases, snapshot);
  for (const run of plan.runs) { run.timestamp = 'unit-test-metadata'; run.pass = true; }
  plan.runs[1].pass = false;
  const result = metrics(plan.runs);
  assert.equal(result['pass@1'], 1);
  assert.equal(result['pass^3'], 0.9);
});

test('frontend parity hashes tolerate only line-ending differences', () => {
  assert.equal(hash('a\r\nb\r\n'), hash('a\nb\n'));
  assert.notEqual(hash('a\nb'), hash('a\nc'));
});

test('one-trial selection never replays saved failures or alters the cohort', () => {
  const session = newSession(cases, snapshot);
  for (const trial of session.runs.slice(0, 2)) {
    trial.timestamp = 'recorded-attempt'; trial.status = 'fail'; trial.pass = false;
  }
  const before = JSON.stringify(session);
  const selected = pendingTrials(session.runs, 1);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].caseId, 'live-chat-phishing');
  assert.equal(selected[0].run, 3);
  assert.equal(JSON.stringify(session), before);
});

test('trial limits cannot disable the cap or replay interrupted work', () => {
  const session = newSession(cases, snapshot);
  session.runs[0].status = 'in-progress';
  assert.equal(pendingTrials(session.runs, 1)[0].run, 2);
  for (const invalid of [0, -1, 31, 1.5, NaN, Infinity, '1']) {
    assert.throws(() => pendingTrials(session.runs, invalid), /Trial limit/);
  }
});

test('old response-only capture cannot prove a POST was never sent or blame Google', () => {
  const diagnosis = diagnoseLiveFailure({api: [], modelOutput: null});
  assert.equal(diagnosis.workerRequestSent, null);
  assert.equal(diagnosis.workerResponseReceived, false);
  assert.equal(diagnosis.modelResponseReceived, false);
  assert.equal(diagnosis.turnstileServerVerified, null);
  assert.equal(diagnosis.stage, 'undetermined-before-model-output');
});

test('observed verification failure before a POST is distinct from an upstream API failure', () => {
  const diagnosis = diagnoseLiveFailure({api: [], diagnostics: {workerRequests: [], states: [
    {status: 'Verifying your browser for Gemini.', tokenPresent: false},
    {status: 'Gemini unavailable. Using the built-in workflow.', tokenPresent: false}
  ]}});
  assert.equal(diagnosis.workerRequestSent, false);
  assert.equal(diagnosis.stage, 'verification-before-worker');
  assert.equal(diagnosis.turnstileServerVerified, null);
});

test('a request event without an HTTP response is not proof Google received it', () => {
  const diagnosis = diagnoseLiveFailure({api: [], diagnostics: {
    workerRequests: [{path: '/api/chat'}], states: []
  }});
  assert.equal(diagnosis.stage, 'worker-request-without-response');
  assert.equal(diagnosis.workerRequestSent, true);
  assert.equal(diagnosis.modelResponseReceived, false);
  assert.equal(diagnosis.turnstileServerVerified, null);
});

test('the actual frontend verification label classifies the observed pre-Worker failure', async () => {
  const frontend = await readFile(new URL('../dist/gemini.js', import.meta.url), 'utf8');
  const label = frontend.match(/status\.textContent = '(Verifying your browser for Gemini[^']*)'/)?.[1];
  assert.ok(label, 'Read the production status instead of assuming its punctuation');
  const observation = {api: [], elapsedMs: 12646, modelOutput: null, diagnostics: {
    workerRequests: [], failedRequests: [], turnstileErrorCodes: [],
    turnstileResponses: [{resource: 'sdk', status: 302}, {resource: 'challenge-resource', status: 401}],
    states: [{status: label, sdkAvailable: true, tokenPresent: false},
      {status: 'Gemini unavailable. Using the built-in workflow.', tokenPresent: false}]
  }};
  const diagnosis = diagnoseLiveFailure(observation);
  assert.equal(diagnosis.stage, 'verification-before-worker');
  assert.equal(diagnosis.workerRequestSent, false);
  assert.equal(diagnosis.modelResponseReceived, false);
  assert.equal(diagnosis.turnstileClientTokenObserved, false);
  assert.equal(diagnosis.turnstileServerVerified, null);
  assert.doesNotMatch(diagnosis.reason, /Legacy|Google.*401/);
});

test('new diagnostics with unknown state text are never mislabeled as legacy capture', () => {
  const diagnosis = diagnoseLiveFailure({api: [], diagnostics: {workerRequests: [], states: []}});
  assert.doesNotMatch(diagnosis.reason, /Legacy/);
  assert.equal(diagnosis.stage, 'undetermined-before-model-output');
});

test('widget frame counting uses the frame tree independently of DOM shadow-root visibility', () => {
  const frameUrls = ['https://kho24.github.io/RiskPilot/', 'about:blank',
    'https://challenges.cloudflare.com/example', 'https://example.invalid/'];
  const page = {frames: () => frameUrls.map(url => ({url: () => url}))};
  assert.equal(challengeBrowserFrameCount(page), 1);
  assert.equal(challengeBrowserFrameCount({frames: () => []}), 0);
});

test('owner-reported manual passes never regrade the three observed production failures', async () => {
  const production = JSON.parse(await readFile(new URL('live-results.json', import.meta.url), 'utf8'));
  const manual = JSON.parse(await readFile(new URL('manual-results.json', import.meta.url), 'utf8'));
  const before = JSON.stringify(production);
  const markdown = renderLiveMarkdown(production, manual);
  assert.equal(JSON.stringify(production), before);
  assert.equal(metrics(production.runs).failed, 3);
  assert.equal(metrics(production.runs).passed, 0);
  assert.equal(metrics(production.runs)['pass@1'], null);
  assert.equal(metrics(production.runs)['pass^3'], null);
  assert.match(markdown, /\| 3 \| 0 \| 3 \| 27 \| Unverified \| Unverified \|/);
  assert.match(markdown, /owner-reported ordinary-browser verification/);
  assert.match(markdown, /manual-chat-phishing \| PASS/);
  assert.equal(manual.workflows.length, 3);
  assert.equal(manual.approvalChecks.length, 6);
});

test('an unrun plan never acquires historical failure claims from report rendering', () => {
  const markdown = renderLiveMarkdown(newSession(cases, snapshot), null);
  assert.doesNotMatch(markdown, /The three recorded Playwright attempts failed/);
  assert.match(markdown, /Manual live verification has not been recorded/);
});
