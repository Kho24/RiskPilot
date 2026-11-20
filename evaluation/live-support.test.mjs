import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {apiPayload, newSession, metrics, reviewTrial, applyObservation, hash, redact} from './live-support.mjs';

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
