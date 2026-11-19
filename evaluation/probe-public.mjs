import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';

// Read-only reachability checks. Never invokes the paid API or reads credentials.
const targets = [
  {id: 'homepage', url: 'https://kho24.github.io/RiskPilot/', local: 'dist/index.html'},
  {id: 'assessment', url: 'https://kho24.github.io/RiskPilot/assessment.html', local: 'dist/assessment.html'},
  {id: 'deployed-app', url: 'https://kho24.github.io/RiskPilot/app.js', local: 'dist/app.js'},
  {id: 'cve-source', url: 'https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2021/44xxx/CVE-2021-44228.json'},
  {id: 'nvd-source', url: 'https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228'}
];
const results = await Promise.all(targets.map(async target => {
  try {
    const response = await fetch(target.url, {signal: AbortSignal.timeout(8000)});
    const bytes = Buffer.from(await response.arrayBuffer());
    const output = {id: target.id, url: target.url, status: response.status, reachable: response.ok};
    if (target.local && response.ok) {
      const hash = value => createHash('sha256').update(value).digest('hex');
      output.matchesCheckoutBytes = hash(bytes) === hash(await readFile(new URL('../' + target.local, import.meta.url)));
      if (target.id === 'deployed-app') output.positionalGeminiCallerPresent = bytes.toString().includes('geminiNote(finding.cve, evidence.score)');
    }
    if (target.id === 'cve-source' && response.ok) {
      const record = JSON.parse(bytes);
      output.returnedCve = record.cveMetadata?.cveId;
      output.recordState = record.cveMetadata?.state;
    }
    if (target.id === 'nvd-source' && response.ok) output.matchingRecord = JSON.parse(bytes).vulnerabilities?.some(item => item.cve?.id === 'CVE-2021-44228') ?? false;
    return output;
  } catch (error) {
    return {id: target.id, url: target.url, reachable: false, error: error.cause?.code ?? error.name, manualRequired: true};
  }
}));
const result = {generatedAt: new Date().toISOString(), scope: 'Read-only HTTP reachability only. No browser rendering or live Gemini inference.', results};
await writeFile(new URL('network-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
for (const item of results) console.log(item.id + ': ' + (item.status ?? item.error));
