import {readFile, writeFile} from 'node:fs/promises';
import {exercise} from './workbench.mjs';
import {grade} from './criteria.mjs';

const dataset = JSON.parse(await readFile(new URL('cases.json', import.meta.url), 'utf8'));
const smokeIds = ['critical-production', 'valid-complete', 'nonexistent-cve', 'asset-prompt-injection'];
const smoke = process.argv[2] === '--smoke';
if (process.argv.length !== (smoke ? 3 : 2)) throw new Error('Usage: node evaluation/run.mjs [--smoke]');
const cases = smoke ? dataset.filter(testCase => smokeIds.includes(testCase.id)) : dataset;
const attempts = smoke ? 1 : 3;

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
