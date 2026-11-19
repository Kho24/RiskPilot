import {demos} from '../dist/demos.js';

const pending = 'Draft / Pending Human Review';

export function grade(testCase, output) {
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
