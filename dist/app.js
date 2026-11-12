import {contextLabels, research, assess, plan, review, agentNote} from './engine.js';
import {demos, demoLabel} from './demos.js';
import {setupGemini} from './gemini.js';

const get = id => document.getElementById(id);
const form = get('assessment');
const queue = [];
const stages = [...document.querySelectorAll('.state')];
const demoPicker = get('demo-picker');
const geminiNote = setupGemini(get('gemini'), get('gemini-challenge'), get('gemini-status'));
let selectedDemo;
let approval = null;

function findingFromForm() {
  const finding = Object.fromEntries(new FormData(form));
  for (const field in finding) finding[field] = finding[field].trim();
  finding.cve = finding.cve.toUpperCase();
  finding.demo = demos[selectedDemo]?.context.cve === finding.cve ? selectedDemo : undefined;
  return finding;
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function drawQueue() {
  get('queued').replaceChildren();
  queue.forEach((finding, index) => {
    const row = element('li');
    row.append(element('span', finding.cve + ' · ' + (finding.asset || 'Unnamed asset') + (finding.demo ? ' · Demo' : '')));
    const remove = element('button', 'Remove', 'secondary');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove queued finding ' + (index + 1));
    remove.addEventListener('click', () => { queue.splice(index, 1); drawQueue(); });
    row.append(remove);
    get('queued').append(row);
  });
  get('runQueue').hidden = queue.length === 0;
}

function setStage(index, label) {
  stages[index].textContent = label;
  stages[index].classList.toggle('active', label !== 'Ready');
}

function log(message) {
  get('trace').append(element('li', message));
}

function list(items, ordered = false) {
  const node = element(ordered ? 'ol' : 'ul');
  items.forEach(item => node.append(element('li', item)));
  return node;
}

function renderReport(result, index, batch) {
  const {finding, evidence, assessment, steps, issues, notes, cloudNote} = result;
  const card = element('article', undefined, 'panel report-card');
  const badges = element('div', undefined, 'risk-row');
  const risk = element('span', 'System priority · ' + assessment.rating, 'badge');
  risk.dataset.risk = assessment.rating;
  badges.append(risk, element('span', evidence.score === undefined ? 'Flaw severity unavailable' : 'Flaw severity (CVSS ' + evidence.cvssVersion + ') · ' + evidence.score.toFixed(1) + ' / 10', 'badge'));
  if (finding.demo) badges.append(element('span', 'Demo snapshot', 'badge'));
  card.append(badges, element('h3', (batch ? (index + 1) + '. ' : '') + finding.cve + ' · ' + (finding.asset || 'Unnamed asset')));
  card.append(element('p', 'CVSS describes the flaw itself. System priority estimates how urgently to act using the score and the details you entered.'));
  card.append(element('p', assessment.reason));
  card.append(element('h4', 'Submitted asset context'));
  const context = element('dl', undefined, 'context');
  for (const [key, label] of Object.entries(contextLabels)) {
    const pair = element('div');
    pair.append(element('dt', label), element('dd', finding[key] || 'Unknown'));
    context.append(pair);
  }
  card.append(context, element('h4', 'Research findings'), element('p', evidence.description || 'No published English vulnerability description was available.'));
  card.append(element('p', 'Source status · ' + evidence.state));
  if (evidence.scoreSource) card.append(element('p', 'CVSS attribution · ' + evidence.scoreSource));
  if (evidence.products.length) card.append(element('p', 'Products listed in evidence · ' + evidence.products.join(', ')));
  const sources = element('ul');
  for (const [label, url] of evidence.references) {
    const row = element('li');
    const anchor = element('a', label);
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    row.append(anchor);
    sources.append(row);
  }
  card.append(sources);
  if (notes[0]) card.append(element('h4', 'Risk Analyst AI note'), element('p', notes[0]));
  if (cloudNote) card.append(element('h4', 'Gemini Risk Analyst note'), element('p', cloudNote));
  card.append(element('h4', 'Remediation plan'), list(steps, true));
  if (notes[1]) card.append(element('h4', 'Remediation AI note'), element('p', notes[1]));
  card.append(element('h4', 'Reviewer checks'), list(issues));
  if (notes[2]) card.append(element('h4', 'Reviewer AI note'), element('p', notes[2]));
  return card;
}

function setApproval(status) {
  approval = status;
  get('approval-status').textContent = status || '';
  get('approval-actions').hidden = status !== 'Draft / Pending Human Review';
  get('download').disabled = status !== 'Human Approved';
}

async function run(findings) {
  setApproval(null);
  const controls = [...document.querySelectorAll('form input, form select, form button, #ai, #gemini')];
  controls.forEach(control => {control.disabled = true;});
  get('results').hidden = true;
  get('trace').replaceChildren();
  get('trace').parentElement.open = true;
  get('message').textContent = 'Assessment in progress…';
  try {
    const useAi = get('ai').checked;
    let modelReady = false;
    if (useAi) {
      try {
        const status = await globalThis.LanguageModel?.availability();
        modelReady = status === 'available';
        get('aiStatus').textContent = modelReady ? 'On-device AI enabled for this run.' : 'On-device model is unavailable or needs setup. Using rules mode.';
      } catch {
        get('aiStatus').textContent = 'On-device model could not initialize. Using rules mode.';
      }
    } else {
      get('aiStatus').textContent = 'Rules mode is active.';
    }
    const results = [];
    for (const finding of findings) {
      log(finding.cve + ' · Starting assessment.');
      stages.forEach((_, index) => setStage(index, 'Ready'));
      const notes = [];
      const note = async (index, role, task, data) => {
        if (!modelReady) return;
        try {
          notes[index] = await agentNote(role, task, data);
          log(role + ' · AI note generated.');
        } catch {
          log(role + ' · AI note unavailable. Rules output retained.');
        }
      };

      setStage(0, 'Running');
      const evidence = await research(finding, log);
      const assessment = assess(finding, evidence);
      let cloudNote;
      if (get('gemini').checked) {
        if (findings.length === 1 && evidence.state === 'PUBLISHED' && Number.isFinite(evidence.score)) {
          try {
            cloudNote = await geminiNote(finding.cve, evidence.score);
            log('Risk Analyst: Gemini note generated.');
          } catch {
            log('Risk Analyst: Gemini note unavailable. Assessment retained.');
          }
        } else {
          log('Risk Analyst: Gemini notes require one live CVE with a published score.');
        }
      }
      await note(0, 'Risk Analyst', 'Explain the provisional rating and the most important uncertainty.', {finding, evidence, assessment});
      log('Risk Analyst · ' + assessment.rating + ' provisional risk.');
      setStage(0, 'Complete');
      setStage(1, 'Running');
      const steps = plan(finding, evidence, assessment);
      await note(1, 'Remediation', 'Suggest one context-specific check for the remediation plan.', {finding, assessment, steps, analystNote: notes[0]});
      log('Remediation · ' + steps.length + ' proposed steps.');
      setStage(1, 'Complete');
      setStage(2, 'Running');
      const issues = review(assessment, evidence);
      await note(2, 'Reviewer', 'Flag any unsupported claim or omission in the proposed notes and plan.', {finding, evidence, assessment, steps, issues, priorNotes: notes});
      log('Reviewer · ' + issues.length + ' verification checks recorded.');
      setStage(2, 'Complete');
      results.push({finding, evidence, assessment, steps, issues, notes, cloudNote});
    }
    results.sort((a, b) => (b.assessment.priority ?? -1) - (a.assessment.priority ?? -1));
    get('report').replaceChildren(...results.map((result, index) => renderReport(result, index, results.length > 1)));
    get('approval-detail').textContent = results.length === 1
      ? 'Review the finding above before deciding whether to finalize this advisory.'
      : 'Your decision applies to all findings in this report. Review each one before finalizing.';
    setApproval('Draft / Pending Human Review');
    get('results').hidden = false;
    get('message').textContent = results.length === 1 ? 'Assessment complete.' : 'Queue complete. Reports ordered by provisional priority.';
    get('results').focus();
  } catch {
    get('message').textContent = 'The assessment could not finish. Review the trace and try again.';
    stages.forEach((stage, index) => { if (stage.textContent === 'Running') setStage(index, 'Interrupted'); });
  } finally {
    controls.forEach(control => {control.disabled = false;});
  }
}

function clearDemoSelection() {
  selectedDemo = undefined;
  get('demo-selection').hidden = true;
}

function loadDemo(key) {
  const demo = demos[key];
  selectedDemo = key;
  for (const [field, value] of Object.entries(demo.context)) get(field).value = value;
  get('demo-tip').textContent = 'Loaded ' + demo.name + '. ' + (demo.tip || 'Choose Run assessment to see the report.');
  get('demo-selection').hidden = false;
  get('message').textContent = demo.name + ' demo loaded.';
  get('cve').focus();
  demoPicker.open = false;
}

const entry = new URLSearchParams(location.search);
const suggestedDemo = entry.get('demo');
for (const [key, demo] of Object.entries(demos)) {
  const option = element('button', 'Use ' + demoLabel(demo) + (key === suggestedDemo ? ' · Suggested' : ''), 'secondary');
  option.type = 'button';
  option.addEventListener('click', () => loadDemo(key));
  get('demo-options').append(option);
}
demoPicker.addEventListener('toggle', () => {
  demoPicker.querySelector('summary').textContent = demoPicker.open ? 'Hide demos' : 'Show demos';
});
const entryCve = entry.get('cve');
if (Object.hasOwn(demos, suggestedDemo)) demoPicker.open = true;
if (/^CVE-\d{4}-\d{4,20}$/i.test(entryCve || '')) {
  get('cve').value = entryCve.toUpperCase();
}
get('cve').addEventListener('input', () => {
  if (selectedDemo && get('cve').value.trim().toUpperCase() !== demos[selectedDemo].context.cve) {
    clearDemoSelection();
    get('message').textContent = 'Demo cleared. Run assessment to look up this CVE.';
  }
});
get('clear-demo').addEventListener('click', () => {
  form.reset();
  clearDemoSelection();
  get('message').textContent = 'Demo cleared. Enter your own CVE or choose another demo.';
  get('cve').focus();
});
get('queue').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  if (queue.length === 5) {
    get('message').textContent = 'The queue is full. Run it or remove a finding.';
    return;
  }
  queue.push(findingFromForm());
  form.reset();
  clearDemoSelection();
  drawQueue();
  get('message').textContent = 'Finding added to the queue.';
  get('cve').focus();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  run([findingFromForm()]);
});
get('runQueue').addEventListener('click', () => run([...queue]));
for (const [button, status, detail] of [
  ['approve', 'Human Approved', 'You can download the final advisory. Approval only applies to this report.'],
  ['request-revision', 'Revision Requested', 'Export is blocked. Update the finding details or queue and run a new assessment for review.'],
  ['reject', 'Rejected', 'This recommendation was rejected. Final export is blocked.']
]) {
  get(button).addEventListener('click', () => {
    if (approval !== 'Draft / Pending Human Review') return;
    setApproval(status);
    get('approval-detail').textContent = detail;
    log('Human approval gate: ' + status + '.');
    get('approval-status').focus();
  });
}

get('download').addEventListener('click', () => {
  if (approval !== 'Human Approved') return;
  const report = get('report').innerHTML;
  const trace = get('trace').outerHTML;
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>RiskPilot assessment report</title><style>body{font:16px/1.5 system-ui;max-width:900px;margin:40px auto;padding:0 20px;color:#172028}article{border-top:1px solid #aab;padding:20px 0;overflow-wrap:anywhere}.risk-row{display:flex;flex-wrap:wrap;gap:8px}.badge{background:#e6efe8;border-radius:5px;padding:3px 8px;font-weight:700}dt{font-weight:700}dd{margin-left:0}a{color:#14547c}@media print{h3,h4{break-after:avoid}}</style>'
    + '<main><h1>RiskPilot assessment report</h1><p>Generated ' + new Date().toISOString() + ' · Human Approved (advisory only)</p>'
    + report + '<h2>Execution trace</h2>' + trace + '</main></html>';
  const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
  const link = element('a');
  link.href = url;
  link.download = 'RiskPilot-assessment.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

get('assessment-js-required').hidden = true;
form.hidden = false;
