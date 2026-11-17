import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLOWLIST,
  evaluateAudit,
  ghsaIdFromUrl,
  readAuditReport,
} from '../ci/npm-audit-allowlist.mjs';

const NOW = new Date('2026-11-17T12:00:00Z');
const PICO_URL = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const allow = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    package: 'picomatch',
    expires: '2027-02-17',
    reason: 'test',
  },
];

const advisory = (name, url, severity = 'high') => ({
  source: 1,
  name,
  dependency: name,
  title: `${name} bug`,
  url,
  severity,
  range: '*',
});
const report = (vulnerabilities, total = 0) => ({
  vulnerabilities,
  metadata: { vulnerabilities: { total } },
});

// ---------------------------------------------------------------------------
// readAuditReport: running npm and parsing its output must fail closed.
// ---------------------------------------------------------------------------

const spawnResult = overrides => ({
  error: undefined,
  signal: null,
  status: 0,
  stdout: JSON.stringify(report({})),
  stderr: '',
  ...overrides,
});

test('readAuditReport accepts a JSON report with exit status 0 or 1', () => {
  assert.equal(readAuditReport(spawnResult({ status: 0 })).ok, true);
  // npm audit exits 1 whenever it finds vulnerabilities.
  const r = readAuditReport(
    spawnResult({
      status: 1,
      stdout: JSON.stringify(
        report({ picomatch: { severity: 'high', via: [] } }, 1)
      ),
    })
  );
  assert.equal(r.ok, true);
  assert.ok(r.report.vulnerabilities.picomatch);
});

test('regression: empty npm audit output fails closed (was treated as 0 vulnerabilities)', () => {
  for (const stdout of ['', '   \n', null, undefined]) {
    const r = readAuditReport(spawnResult({ stdout }));
    assert.equal(r.ok, false, `stdout=${JSON.stringify(stdout)}`);
    assert.match(r.failure, /printed no output/);
  }
});

test('regression: spawn error fails closed (npm missing or not runnable)', () => {
  const r = readAuditReport(
    spawnResult({
      error: new Error('spawnSync npm ENOENT'),
      stdout: '',
      status: null,
    })
  );
  assert.equal(r.ok, false);
  assert.match(r.failure, /Failed to run npm audit: spawnSync npm ENOENT/);
});

test('killed npm fails closed even if partial JSON was printed', () => {
  const r = readAuditReport(
    spawnResult({ signal: 'SIGTERM', status: null, stdout: '{}' })
  );
  assert.equal(r.ok, false);
  assert.match(r.failure, /killed by SIGTERM/);
});

test('unexpected exit status fails closed even with parseable JSON', () => {
  const r = readAuditReport(spawnResult({ status: 2, stdout: '{}' }));
  assert.equal(r.ok, false);
  assert.match(r.failure, /unexpected status 2/);
});

test('unparseable or non-object output fails closed', () => {
  assert.match(
    readAuditReport(spawnResult({ stdout: 'npm ERR! network' })).failure,
    /Could not parse/
  );
  for (const stdout of ['null', '[]', '42', '"x"']) {
    const r = readAuditReport(spawnResult({ stdout }));
    assert.equal(r.ok, false, `stdout=${stdout}`);
  }
});

test('stderr is included in failures to aid debugging', () => {
  const r = readAuditReport(
    spawnResult({ stdout: '', stderr: 'npm ERR! code ENOLOCK' })
  );
  assert.match(r.failure, /ENOLOCK/);
});

test('regression: empty output never reaches a passing evaluation', () => {
  // End-to-end shape of the old bug: `JSON.parse(stdout || '{}')` + `?? {}`.
  const r = readAuditReport(spawnResult({ stdout: '' }));
  assert.equal(r.ok, false);
  assert.equal(evaluateAudit({}, allow, NOW).ok, false);
});

// ---------------------------------------------------------------------------
// evaluateAudit
// ---------------------------------------------------------------------------

test('ghsaIdFromUrl normalizes case and rejects non-GHSA input', () => {
  assert.equal(ghsaIdFromUrl(PICO_URL), 'GHSA-fc5q-39xc-vjpf');
  assert.equal(
    ghsaIdFromUrl('https://github.com/advisories/ghsa-FC5Q-39XC-VJPF'),
    'GHSA-fc5q-39xc-vjpf'
  );
  assert.equal(ghsaIdFromUrl('https://npmjs.com/advisories/123'), null);
  assert.equal(ghsaIdFromUrl(undefined), null);
});

test('clean report passes', () => {
  const r = evaluateAudit(report({}), allow, NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.unused, ['picomatch GHSA-fc5q-39xc-vjpf']);
});

test('allowlisted advisory passes, including transitive dependents', () => {
  const r = evaluateAudit(
    report(
      {
        picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
        micromatch: { severity: 'high', via: ['picomatch'] },
        jest: { severity: 'high', via: ['micromatch'] },
      },
      3
    ),
    allow,
    NOW
  );
  assert.equal(r.ok, true, r.failures.join('\n'));
  assert.deepEqual(r.unused, []);
});

test('regression: dependency cycles do not block an allowlisted root cause', () => {
  // vitest <-> @vitest/coverage-v8 and metro <-> metro-config point at each other in real reports.
  const r = evaluateAudit(
    report({
      picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
      vitest: { severity: 'high', via: ['@vitest/coverage-v8', 'picomatch'] },
      '@vitest/coverage-v8': { severity: 'high', via: ['vitest'] },
      metro: { severity: 'high', via: ['metro-config'] },
      'metro-config': { severity: 'high', via: ['metro'] },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, true, r.failures.join('\n'));
});

test('regression: a cycle does not mask a non-allowlisted advisory', () => {
  const r = evaluateAudit(
    report({
      'metro-config': { severity: 'high', via: ['metro'] },
      metro: {
        severity: 'high',
        via: [
          'metro-config',
          advisory(
            'metro',
            'https://github.com/advisories/GHSA-aaaa-bbbb-cccc'
          ),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(
    r.failures.join('\n'),
    /metro GHSA-aaaa-bbbb-cccc \(high\): not allowlisted/
  );
});

test('non-allowlisted advisory fails even alongside an allowlisted one', () => {
  const r = evaluateAudit(
    report({
      picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
      'node-forge': {
        severity: 'moderate',
        via: [
          advisory(
            'node-forge',
            'https://github.com/advisories/GHSA-j8rw-jp99-435v',
            'moderate'
          ),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0], /node-forge GHSA-j8rw-jp99-435v/);
});

test('a new advisory on an allowlisted package still fails', () => {
  const r = evaluateAudit(
    report({
      picomatch: {
        severity: 'high',
        via: [
          advisory('picomatch', PICO_URL),
          advisory(
            'picomatch',
            'https://github.com/advisories/GHSA-dddd-eeee-ffff'
          ),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(r.failures.join('\n'), /picomatch GHSA-dddd-eeee-ffff/);
});

test('allowlist matches on package as well as GHSA id', () => {
  const r = evaluateAudit(
    report({
      'other-pkg': { severity: 'high', via: [advisory('other-pkg', PICO_URL)] },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
});

test('expired allowlist entry fails', () => {
  const r = evaluateAudit(
    report({
      picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
    }),
    allow,
    new Date('2027-02-18T00:00:00Z')
  );
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /expired on 2027-02-17/);
});

test('fails closed on npm audit error payload', () => {
  const r = evaluateAudit(
    { error: { code: 'ENOLOCK', summary: 'no lockfile' } },
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /no lockfile/);
});

test('fails closed on missing vulnerabilities map or non-object input', () => {
  assert.equal(evaluateAudit({}, allow, NOW).ok, false);
  assert.equal(evaluateAudit(null, allow, NOW).ok, false);
  assert.equal(evaluateAudit([], allow, NOW).ok, false);
  assert.equal(evaluateAudit({ vulnerabilities: [] }, allow, NOW).ok, false);
});

test('fails closed when metadata reports findings but the map is empty', () => {
  const r = evaluateAudit(report({}, 5), allow, NOW);
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /reports 5 vulnerabilities/);
});

test('fails closed on an entry with no via info', () => {
  const r = evaluateAudit(
    report({ mystery: { severity: 'high', via: [] } }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /mystery/);
});

test('fails closed when via names a package missing from the report', () => {
  const r = evaluateAudit(
    report({ jest: { severity: 'high', via: ['ghost-pkg'] } }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(r.failures[0], /ghost-pkg/);
});

test('regression: missing or unknown severity fails closed (was silently skipped)', () => {
  for (const severity of [undefined, null, '', 'severe', 'HIGH']) {
    const r = evaluateAudit(
      report({
        x: {
          severity,
          via: [
            advisory('x', 'https://github.com/advisories/GHSA-zzzz-zzzz-zzzz'),
          ],
        },
      }),
      allow,
      NOW
    );
    assert.equal(r.ok, false, `entry severity=${JSON.stringify(severity)}`);
    assert.match(r.failures[0], /unrecognized severity/);
  }
  const r = evaluateAudit(
    report({
      x: {
        severity: 'high',
        via: [
          {
            ...advisory(
              'x',
              'https://github.com/advisories/GHSA-zzzz-zzzz-zzzz'
            ),
            severity: undefined,
          },
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false, 'advisory with no severity');
  assert.match(r.failures[0], /unrecognized severity/);
});

test('info-severity entries do not fail the gate', () => {
  const r = evaluateAudit(
    report({
      x: {
        severity: 'info',
        via: [
          advisory(
            'x',
            'https://github.com/advisories/GHSA-zzzz-zzzz-zzzz',
            'info'
          ),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, true);
});

test('every shipped allowlist entry is well formed and time-boxed', () => {
  for (const a of ALLOWLIST) {
    assert.match(a.id, /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/);
    assert.ok(a.package);
    assert.match(a.expires, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(a.reason.length > 20);
  }
});
