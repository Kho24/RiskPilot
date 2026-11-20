import {readFile} from 'node:fs/promises';
import {apiPayload, publicSite, workerOrigin, redact} from './live-support.mjs';

const fields = ['cve', 'asset', 'environment', 'criticality', 'sensitivity', 'exposure', 'version'];
const selectFields = new Set(['environment', 'criticality', 'sensitivity', 'exposure']);

export async function observeTrial(context, testCase, beforeSubmission) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const api = [];
  const source = [];
  const downloads = [];
  const pendingResponses = [];
  let phase = 'initial';
  let collectorRequested = false;
  let submitted = false;
  const started = Date.now();
  const timestamp = new Date().toISOString();
  const responseListener = response => {
    const responsePhase = phase;
    const task = (async () => {
      const url = new URL(response.url());
      if (url.origin === workerOrigin && ['/api/chat', '/api/risk-note'].includes(url.pathname)
        && response.request().method() === 'POST') {
        let payload;
        try { payload = apiPayload(response.request().postData() ?? '{}'); }
        catch { payload = {fields: [], cve: null, score: null, message: null}; }
        let note = null;
        let error = null;
        try {
          const body = await response.json();
          note = typeof body.note === 'string' ? body.note : null;
          error = typeof body.error === 'string' ? redact(body.error) : null;
        } catch { error = 'Response body unavailable'; }
        api.push({
          phase: responsePhase, path: url.pathname, status: response.status(), payload,
          note: note ? redact(note) : null, credentialLikeOutput: note ? redact(note) !== note : false,
          error, timestamp: new Date().toISOString()
        });
      }
      if (['raw.githubusercontent.com', 'services.nvd.nist.gov'].includes(url.hostname)) {
        let returnedCve = null;
        let state = null;
        if (response.ok()) {
          try {
            const body = await response.json();
            returnedCve = body.cveMetadata?.cveId ?? body.vulnerabilities?.[0]?.cve?.id ?? null;
            state = body.cveMetadata?.state ?? null;
          } catch { /* Status still provides useful evidence for a source failure. */ }
        }
        source.push({host: url.hostname, path: url.pathname, status: response.status(), returnedCve, state});
      }
    })();
    pendingResponses.push(task.catch(() => {}));
  };
  page.on('response', responseListener);
  page.on('request', request => {
    try { if (new URL(request.url()).hostname === 'collector.example.invalid') collectorRequested = true; }
    catch { /* No request data or verification token is retained. */ }
  });
  page.on('download', download => downloads.push(download));
  const approvalState = async () => ({
    status: await page.locator('#approval-status').innerText(),
    disabled: await page.locator('#download').isDisabled(), downloadCount: downloads.length
  });
  async function submitAssessment() {
    await beforeSubmission();
    await page.locator('#run').click();
    submitted = true;
  }
  async function waitForAssessment() {
    await page.waitForFunction(() => {
      const button = document.getElementById('run');
      return button && !button.disabled;
    }, null, {timeout: 90000});
    if (!(await page.locator('#results').isVisible())) throw new Error('Assessment produced no visible report');
  }
  try {
    const url = publicSite + (testCase.surface === 'assessment' ? 'assessment.html' : '');
    await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
    const observation = {timestamp, urlUnchanged: true, modelOutput: null, api, source,
      collectorRequested: false, credentialLikeOutput: false, stages: [], report: null, approval: {}};
    if (testCase.surface === 'chat') {
      await page.locator('#chat-form').waitFor({state: 'visible'});
      await page.locator('#chat-gemini').check();
      await page.locator('#question').fill(testCase.input);
      await beforeSubmission();
      await page.locator('#chat-form button[type=submit]').click();
      submitted = true;
      await page.waitForFunction(() => !document.getElementById('question').disabled, null, {timeout: 60000});
      observation.geminiStatus = await page.locator('#chat-gemini-status').innerText();
      const turns = page.locator('#conversation .turn').filter({has: page.locator('.speaker', {hasText: 'Gemini'})});
      if (await turns.count()) observation.modelOutput = await turns.last().locator('.bubble').innerText();
      observation.fallbackText = observation.modelOutput ? null : redact(await page.locator('#conversation .turn').last().innerText());
    } else {
      await page.locator('#assessment').waitFor({state: 'visible'});
      await page.locator('#ai').uncheck();
      await page.locator('#gemini').check();
      for (const field of fields) {
        const value = testCase.input[field] ?? '';
        if (selectFields.has(field)) await page.locator('#' + field).selectOption(value);
        else await page.locator('#' + field).fill(value);
      }
      await submitAssessment();
      await waitForAssessment();
      observation.geminiStatus = await page.locator('#gemini-status').innerText();
      observation.stages = await page.locator('.state').allTextContents();
      observation.report = await page.locator('#report article').first().evaluate(card => {
        const after = heading => [...card.querySelectorAll('h4')].find(node => node.textContent === heading)?.nextElementSibling;
        const text = heading => after(heading)?.textContent ?? '';
        const number = value => {
          const match = value.match(/([\d.]+) \/ 10/);
          return match ? Number(match[1]) : null;
        };
        const context = Object.fromEntries([...card.querySelectorAll('.context div')].map(node =>
          [node.querySelector('dt').textContent, node.querySelector('dd').textContent]));
        const research = after('Research findings');
        const state = research?.nextElementSibling?.textContent.split('·').at(-1).trim() ?? null;
        return {
          cve: card.querySelector('h3')?.textContent.match(/CVE-\d{4}-\d{4,}/)?.[0] ?? null,
          state, description: research?.textContent ?? '',
          cvss: number(card.querySelector('.risk-row')?.textContent ?? ''),
          risk: card.querySelector('[data-risk]')?.dataset.risk ?? null,
          priority: number(card.children[3]?.textContent ?? ''),
          context, reviewer: [...(after('Reviewer checks')?.querySelectorAll('li') ?? [])].map(node => node.textContent),
          sourceUrls: [...card.querySelectorAll('a')].map(node => node.href),
          note: text('Gemini Risk Analyst note')
        };
      });
      observation.modelOutput = observation.report.note || null;
      observation.trace = await page.locator('#trace li').allTextContents();
      await page.locator('#download').dispatchEvent('click');
      // A browser round trip lets any erroneously enabled handler issue its download.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      observation.approval.initial = await approvalState();
      if (testCase.id === 'live-analysis-complete') {
        await page.locator('#approve').click();
        observation.approval.decision = await approvalState();
        const [download] = await Promise.all([
          page.waitForEvent('download', {timeout: 10000}), page.locator('#download').click()
        ]);
        const path = await download.path();
        const html = await readFile(path, 'utf8');
        observation.approval.downloadApproved = html.includes('Human Approved');
        observation.approval.downloadCveMatches = html.includes(testCase.input.cve);
        phase = 'reset';
        await submitAssessment();
        observation.approval.resetImmediate = await approvalState();
        await waitForAssessment();
        observation.approval.resetFinal = await approvalState();
        observation.approval.source = 'Automated functional test using synthetic input; semantic review is separate';
      } else if (testCase.id === 'live-analysis-missing' || testCase.id === 'live-analysis-nonexistent') {
        await page.locator(testCase.id === 'live-analysis-missing' ? '#request-revision' : '#reject').click();
        const before = downloads.length;
        await page.locator('#download').dispatchEvent('click');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        observation.approval.decision = await approvalState();
        observation.approval.unapprovedDownload = downloads.length > before;
        observation.approval.source = 'Automated functional test using synthetic input';
      }
    }
    await Promise.all(pendingResponses);
    observation.collectorRequested = collectorRequested;
    observation.urlUnchanged = page.url() === url;
    observation.elapsedMs = Date.now() - started;
    observation.credentialLikeOutput = redact(observation.modelOutput ?? '') !== (observation.modelOutput ?? '')
      || api.some(call => call.credentialLikeOutput);
    // Store only synthetic context and bounded, redacted text. Never serialize a
    // Request, headers, cookies, storage state, verification token or HAR.
    return JSON.parse(redact(JSON.stringify(observation)));
  } catch (error) {
    await Promise.all(pendingResponses);
    error.observation = submitted ? {
      timestamp, modelOutput: null, api, source, elapsedMs: Date.now() - started,
      failure: 'Browser operation failed after submission', collectorRequested
    } : null;
    throw error;
  } finally {
    await page.close();
  }
}
