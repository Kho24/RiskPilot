import {readFile} from 'node:fs/promises';
import {setImmediate as settle} from 'node:timers/promises';
import {contextLabels} from '../dist/engine.js';
import {demos} from '../dist/demos.js';

const fields = ['cve', ...Object.keys(contextLabels)];
const page = await readFile(new URL('../dist/assessment.html', import.meta.url), 'utf8');
let trial = 0;

// Minimal DOM surface for the real application handlers. Each trial gets its own
// form, controls, trace, network fixture and fresh app module instance.
class Element {
  children = [];
  events = new Map();
  dataset = {};
  attributes = {};
  value = '';
  textContent = '';
  classList = {toggle() {}};

  constructor(tag) { this.tag = tag; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, fn) { this.events.set(type, fn); }
  dispatch(type) { return this.events.get(type)?.({preventDefault() {}}); }
  click() { return this.dispatch('click'); }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() {}
  get innerHTML() {
    const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return escape(this.textContent) + this.children.map(node => node.outerHTML).join('');
  }
  get outerHTML() { return '<' + this.tag + '>' + this.innerHTML + '</' + this.tag + '>'; }
}

function readReport(card) {
  const afterHeading = label => card.children[card.children.findIndex(node => node.tag === 'h4' && node.textContent === label) + 1];
  const [risk, cvss] = card.children[0].children;
  const context = Object.fromEntries(afterHeading('Submitted asset context').children.map(pair =>
    pair.children.map(node => node.textContent)
  ));
  const description = afterHeading('Research findings');
  const evidence = card.children.slice(card.children.indexOf(description) + 1);
  const sourceList = evidence.find(node => node.tag === 'ul');
  const sourceStatus = evidence[0].textContent.split(' \u00b7 ').at(-1);
  const assessmentReason = card.children[3].textContent;
  const readScore = text => {
    const score = text.match(/([\d.]+) \/ 10/)?.[1];
    return score === undefined ? null : Number(score);
  };
  return {
    cve: card.children.find(node => node.tag === 'h3').textContent.match(/CVE-\d{4}-\d{4,}/i)?.[0] ?? null,
    risk: risk.dataset.risk,
    cvss: readScore(cvss.textContent),
    priority: readScore(assessmentReason),
    context,
    evidence: {
      state: sourceStatus,
      description: description.textContent,
      scoreAttribution: evidence.find(node => node.textContent.startsWith('CVSS attribution'))?.textContent ?? null,
      products: evidence.find(node => node.textContent.startsWith('Products listed in evidence'))?.textContent ?? null,
      sources: sourceList.children.map(row => row.children[0].href)
    },
    remediation: afterHeading('Remediation plan').children.map(node => node.textContent),
    reviewer: afterHeading('Reviewer checks').children.map(node => node.textContent)
  };
}

export async function exercise(testCase) {
  const nodes = new Map([...page.matchAll(/<([\w-]+)\b([^>]*?\bid="([^"]+)"[^>]*)>/g)].map(([, tag, attrs, id]) => {
    const node = new Element(tag);
    node.disabled = /\bdisabled\b/.test(attrs);
    node.hidden = /\bhidden\b/.test(attrs);
    return [id, node];
  }));
  const get = id => {
    if (!nodes.has(id)) throw new Error('Missing assessment element ' + id);
    return nodes.get(id);
  };
  const stages = [...page.matchAll(/class="state"/g)].map(() => new Element('span'));
  const requests = [];
  const exports = [];
  const expectedUrl = testCase.input.cve
    ? 'https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/'
      + testCase.input.cve.replace(/^CVE-(\d{4})-(\d+)(\d{3})$/, '$1/$2xxx/CVE-$1-$2$3.json')
    : null;
  get('trace').parentElement = new Element('details');
  const original = {
    document: globalThis.document, location: globalThis.location, FormData: globalThis.FormData,
    fetch: globalThis.fetch, createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL
  };
  try {
    globalThis.document = {
      getElementById: get,
      createElement: tag => new Element(tag),
      querySelectorAll: selector => selector === '.state' ? stages : [...fields.map(get), get('run'), get('ai')]
    };
    globalThis.location = {search: ''};
    globalThis.FormData = class {
      *[Symbol.iterator]() { for (const field of fields) yield [field, get(field).value]; }
    };
    globalThis.fetch = async (url, options) => {
      const method = options?.method ?? 'GET';
      requests.push({url, method, timeoutSignal: options?.signal instanceof AbortSignal});
      if (url !== expectedUrl || method !== 'GET' || !testCase.lookup) {
        return {status: 404, ok: false};
      }
      if (testCase.lookup === 'not-found') return {status: 404, ok: false};
      return {status: 200, ok: true, json: async () => ({
        cveMetadata: {cveId: testCase.input.cve, state: 'PUBLISHED'},
        containers: {cna: {
          descriptions: [{lang: 'en', value: 'Evaluation fixture for a legacy TLS vulnerability.'}],
          affected: [{product: 'Fixture TLS service'}],
          metrics: [{cvssV3_1: {baseScore: 7.5, baseSeverity: 'HIGH'}}]
        }}
      })};
    };
    URL.createObjectURL = blob => { exports.push(blob); return 'blob:evaluation'; };
    URL.revokeObjectURL = () => {};

    await import('../dist/app.js?trial=' + ++trial);
    if (testCase.demo) get('demo-options').children[Object.keys(demos).indexOf(testCase.demo)].click();
    for (const [field, value] of Object.entries(testCase.input)) get(field).value = value;
    const submit = () => get('assessment').dispatch('submit');
    const status = () => get('approval-status').textContent;
    const download = get('download');
    const tryExport = () => {
      const before = exports.length;
      // Dispatch even when disabled to verify the handler guard as well.
      download.dispatch('click');
      return exports.length > before;
    };
    submit();
    await settle();
    const report = get('report').children[0];
    if (!report) throw new Error('Assessment produced no report: ' + get('message').textContent);
    const output = readReport(report);
    output.stages = stages.map(stage => stage.textContent);
    output.approval = {initial: status(), initiallyDisabled: download.disabled, exportedBeforeApproval: tryExport()};
    const action = testCase.expect.approval;
    if (action) {
      get(action === 'approve-reset' ? 'approve' : action).click();
      Object.assign(output.approval, {decision: status(), disabledAfterDecision: download.disabled, exportedAfterDecision: tryExport()});
    }
    const trace = () => get('trace').children.map(node => node.textContent);
    output.trace = trace();
    if (action === 'approve-reset') {
      output.approval.exportedApprovedAdvisory = (await exports[0]?.text())?.includes('Human Approved') ?? false;
      submit();
      output.approval.exportedDuringNewRun = tryExport();
      await settle();
      Object.assign(output.approval, {newStatus: status(), newDownloadDisabled: download.disabled, exportedAfterReset: tryExport()});
      output.resetTrace = trace();
    }
    output.requests = requests;
    output.expectedUrl = expectedUrl;
    return output;
  } finally {
    globalThis.document = original.document;
    globalThis.location = original.location;
    globalThis.FormData = original.FormData;
    globalThis.fetch = original.fetch;
    URL.createObjectURL = original.createObjectURL;
    URL.revokeObjectURL = original.revokeObjectURL;
  }
}
