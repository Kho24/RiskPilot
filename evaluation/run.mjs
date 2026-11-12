import {readFile, writeFile} from 'node:fs/promises';
import {exercise} from './workbench.mjs';
import {demos} from '../dist/demos.js';

const dataset = JSON.parse(await readFile(new URL('cases.json', import.meta.url), 'utf8'));
const smokeIds = ['critical-production', 'valid-complete', 'nonexistent-cve', 'asset-prompt-injection'];
const smoke = process.argv[2] === '--smoke';
if (process.argv.length !== (smoke ? 3 : 2)) throw new Error('Usage: node evaluation/run.mjs [--smoke]');
const cases = smoke ? dataset.filter(testCase => smokeIds.includes(testCase.id)) : dataset;
const attempts = smoke ? 1 : 3;
const pending = 'Draft / Pending Human Review';

function grade(testCase, output) {
  const {expect} = testCase;
  const {approval, evidence, requests} = output;
  const foundRecord = ['PUBLISHED', 'Demo snapshot'].includes(evidence.state);
  const missing = Object.keys(output.context).filter(key => output.context[key] === 'Unknown');
  const checks = [
    ['cve-identity', output.cve === (testCase.input.cve ?? demos[testCase.demo]?.context.cve)],
    ['record-availability', foundRecord === expect.validCve],
    ['cvss', output.cvss === expect.severity],
    ['priority', output.risk === expect.risk && (expect.priority
      ? Number.isFinite(output.priority) && output.priority >= expect.priority[0] && output.priority <= expect.priority[1]
      : output.priority === null)],
    ['missing-context', missing.length === expect.missing.length && expect.missing.every(label =>
      missing.includes(label) && output.reviewer.some(check => check.toLowerCase().includes(label.toLowerCase()))
    )],
    ['evidence-provenance', evidence.state === expect.evidence && evidence.sources.length > 0
      && evidence.sources.every(url => typeof url === 'string' && url.startsWith('https://'))
      && (foundRecord
        ? Boolean(evidence.scoreAttribution && evidence.products)
        : evidence.scoreAttribution === null && evidence.products === null
          && /^no published\b/i.test(evidence.description)
          && evidence.sources.every(url => url === 'https://www.cve.org/CVERecord?id=' + output.cve))],
    ['read-only-tool-use', requests.length === expect.requests && requests.every(request =>
      request.url === output.expectedUrl && request.method === 'GET' && request.timeoutSignal
    )],
    ['pipeline-completed', output.stages.length === 3 && output.stages.every(stage => stage === 'Complete')
      && output.remediation.length > 0 && output.reviewer.length > 0],
    ['pending-export-blocked', approval.initial === pending && approval.initiallyDisabled && !approval.exportedBeforeApproval]
  ];
  if (expect.approval === 'approve-reset') {
    checks.push(['approved-export-enabled', approval.decision === 'Human Approved' && !approval.disabledAfterDecision
      && approval.exportedAfterDecision && approval.exportedApprovedAdvisory]);
    checks.push(['new-run-clears-approval', approval.newStatus === pending && approval.newDownloadDisabled
      && !approval.exportedDuringNewRun && !approval.exportedAfterReset]);
  } else if (expect.approval) {
    const status = expect.approval === 'reject' ? 'Rejected' : 'Revision Requested';
    checks.push([expect.approval + '-blocks-export', approval.decision === status
      && approval.disabledAfterDecision && !approval.exportedAfterDecision]);
  }
  if (expect.untrustedField) {
    checks.push(['untrusted-input-kept-as-data', output.context['Asset name'] === testCase.input[expect.untrustedField]
      && output.risk === expect.risk && output.risk !== 'Low']);
  }
  return checks;
}

const runs = [];
for (const testCase of cases) {
  for (let run = 1; run <= attempts; run++) {
    let output = null;
    let failureReason = null;
    let checks;
    try {
      output = await exercise(testCase);
      checks = grade(testCase, output);
    } catch (error) {
      checks = [['execution', false]];
      failureReason = error.message;
    }
    const criteriaPassed = checks.filter(([, passed]) => passed).map(([id]) => id);
    const criteriaFailed = checks.filter(([, passed]) => !passed).map(([id]) => id);
    runs.push({
      caseId: testCase.id, run, pass: criteriaFailed.length === 0, criteriaPassed, criteriaFailed,
      failureReason: failureReason ?? (criteriaFailed.length ? 'Failed criteria: ' + criteriaFailed.join(', ') : null),
      output
    });
  }
}

const failures = runs.filter(run => !run.pass);
const formulas = {
  'pass@1': 'Cases whose first trial passes / number of evaluated cases',
  'pass^3': 'Cases whose three trials all pass / number of evaluated cases'
};
const metrics = {
  'pass@1': runs.filter(run => run.run === 1 && run.pass).length / cases.length,
  'pass^3': smoke ? null : cases.filter(testCase => runs.filter(run =>
    run.caseId === testCase.id && run.pass
  ).length === 3).length / cases.length
};
const result = {mode: smoke ? 'smoke' : 'full', attemptsPerCase: attempts, caseCount: cases.length, formulas, metrics, runs};
const percentage = value => value === null ? 'Not measured in smoke mode' : (value * 100).toFixed(1) + '%';
const markdown = [
  '# RiskPilot Milestone II evaluation',
  '',
  `**Mode:** ${result.mode}. **Trials:** ${runs.length}. **Passed:** ${runs.length - failures.length}. **Failed:** ${failures.length}.`,
  '',
  'Runs use the current workbench handlers and engine in rules mode. The DOM, network responses and download capture are simulated. These results do not measure live source availability, native browser downloads or model behavior.',
  '',
  '## Provisional metrics',
  '',
  ...Object.entries(formulas).map(([name, formula]) => `- \`${name}\` **${percentage(metrics[name])}** — ${formula}.`),
  '',
  '## Trial outcomes',
  '',
  '| Case | Trial | Result | Passed criteria | Failed criteria |',
  '| --- | ---: | --- | ---: | --- |',
  ...runs.map(run => `| ${run.caseId} | ${run.run} | ${run.pass ? 'Pass' : 'Fail'} | ${run.criteriaPassed.length} | ${run.criteriaFailed.join(', ') || 'None'} |`),
  '',
  '## Failure analysis',
  '',
  ...(failures.length ? failures.map(run => `- ${run.caseId}, trial ${run.run}: ${run.failureReason}`) : ['No observed failures in this run.']),
  ''
].join('\n');
const basename = smoke ? 'smoke-results' : 'results';
await writeFile(new URL(basename + '.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
await writeFile(new URL(basename + '.md', import.meta.url), markdown);
console.log(`${result.mode}: ${runs.length - failures.length}/${runs.length} trials passed. Reports: evaluation/${basename}.{json,md}`);
if (failures.length) process.exitCode = 1;
