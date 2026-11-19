import {execFileSync} from 'node:child_process';
import {readFile, readdir, writeFile, mkdir} from 'node:fs/promises';

// Scan source, never credential stores, environment values or Wrangler state.
const tracked = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'}).split('\0').filter(Boolean);
const generated = [];
for (const folder of ['evaluation', 'security']) {
  for (const item of await readdir(folder, {withFileTypes: true}).catch(() => [])) {
    if (item.isFile() && /\.(mjs|json|md)$/.test(item.name)) generated.push(folder + '/' + item.name);
  }
}
const files = [...new Set([...tracked, ...generated])];
const patterns = [
  ['google-api-key', /AIza[0-9A-Za-z_-]{35}/g],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['aws-access-key', /(?:AKIA|ASIA)[A-Z0-9]{16}/g],
  ['bearer-credential', /Bearer\s+[A-Za-z0-9._-]{24,}/g],
  ['credential-in-url', /https?:\/\/[^\s/@]+:[^\s/@]+@/g]
];
const findings = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const [type, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({file, line: text.slice(0, match.index).split('\n').length, type});
    }
  }
}
await mkdir('security', {recursive: true});
const result = {
  generatedAt: new Date().toISOString(), fileCount: files.length,
  scope: 'Tracked files and final evaluation/security drafts. No matched values are stored or printed.',
  excluded: ['Git history', '.wrangler/', 'dashboard secrets', 'environment-variable values', 'other untracked files'],
  limitations: 'Pattern scan and source review cannot prove absence of every credential or sensitive endpoint.',
  findings
};
await writeFile('security/secret-scan.json', JSON.stringify(result, null, 2) + '\n');
console.log('Secret-pattern scan: ' + findings.length + ' findings across ' + files.length + ' files.');
if (findings.length) process.exitCode = 1;
