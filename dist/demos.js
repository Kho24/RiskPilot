export const demos = {
  log4shell: {
    name: 'Log4Shell',
    context: {
      cve: 'CVE-2021-44228', asset: 'Customer-facing web application', environment: 'Production',
      criticality: 'High', sensitivity: 'High', exposure: 'Internet-facing', version: 'Apache Log4j Core 2.14.1'
    },
    score: 10, severity: 'Critical', scoreSource: 'NVD demo snapshot',
    description: 'Affected Apache Log4j Core versions can perform attacker-controlled JNDI lookups, which may allow remote code execution.',
    products: ['Apache Log4j Core'],
    references: [
      ['NVD record', 'https://nvd.nist.gov/vuln/detail/CVE-2021-44228'],
      ['Apache security advisory', 'https://logging.apache.org/log4j/2.x/security.html']
    ]
  },
  sweet32: {
    name: 'Sweet32',
    context: {
      cve: 'CVE-2016-2183', asset: 'Internal legacy web portal', environment: 'Staging',
      criticality: 'Medium', sensitivity: 'Low', exposure: 'Internal', version: 'Legacy TLS service with 3DES enabled (simulated)'
    },
    score: 7.5, severity: 'High', scoreSource: 'NVD demo snapshot',
    description: 'Under certain conditions, an attacker observing large amounts of traffic from a long-running session that uses 3DES can recover portions of the protected data.',
    products: ['TLS services using 3DES'],
    references: [['NVD record', 'https://nvd.nist.gov/vuln/detail/CVE-2016-2183']],
    tip: 'To see the priority change, run the demo once. Then set Exposure to Internet-facing and both Asset criticality and Data sensitivity to High. Run it again to compare.'
  },
  'php-filter': {
    name: 'PHP filter flaw',
    context: {
      cve: 'CVE-2024-11233', asset: 'Test document importer', environment: 'Development',
      criticality: 'Low', sensitivity: 'Low', exposure: 'Isolated', version: 'PHP 8.3.13'
    },
    score: 4.8, severity: 'Medium', scoreSource: 'PHP Group advisory demo snapshot',
    description: 'A PHP decoding filter can read one byte beyond its buffer for some inputs. In certain cases the process may crash or reveal memory contents.',
    products: ['PHP'],
    references: [
      ['PHP Group security advisory', 'https://github.com/php/php-src/security/advisories/GHSA-r977-prxv-hc43'],
      ['NVD record with alternate score', 'https://nvd.nist.gov/vuln/detail/CVE-2024-11233']
    ]
  }
};

export function demoLabel(demo) {
  return demo.name + ' · ' + demo.severity + ' (' + demo.score.toFixed(1) + ')';
}
