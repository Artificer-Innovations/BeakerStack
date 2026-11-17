import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLOWLIST,
  evaluateAudit,
  ghsaIdFromUrl,
  readAuditReport,
  runGate,
} from '../ci/npm-audit-gate.mjs';

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
      metro: { severity: 'high', via: ['metro-config', 'micromatch'] },
      micromatch: { severity: 'high', via: ['picomatch'] },
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

test('regression: an advisory-free cycle fails closed (was passing with an empty allowlist)', () => {
  for (const allowlist of [[], allow]) {
    const r = evaluateAudit(
      report(
        {
          metro: { severity: 'high', via: ['metro-config'] },
          'metro-config': { severity: 'high', via: ['metro'] },
        },
        2
      ),
      allowlist,
      NOW
    );
    assert.equal(r.ok, false);
    assert.match(
      r.failures.join('\n'),
      /metro \(high\): no advisory reachable/
    );
    assert.match(
      r.failures.join('\n'),
      /metro-config \(high\): no advisory reachable/
    );
  }
});

test('an advisory-free cycle fails even when another chain is allowlisted', () => {
  const r = evaluateAudit(
    report({
      picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
      a: { severity: 'high', via: ['b'] },
      b: { severity: 'high', via: ['a'] },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.failures.map(f => f.split(' ')[0]).sort(), ['a', 'b']);
});

test('advisories are checked even when their entry is marked info', () => {
  const r = evaluateAudit(
    report({
      x: {
        severity: 'info',
        via: [
          advisory('x', 'https://github.com/advisories/GHSA-hhhh-iiii-jjjj'),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(r.ok, false);
  assert.match(
    r.failures[0],
    /x GHSA-hhhh-iiii-jjjj \(high\): not allowlisted/
  );
});

test('regression: an info-only advisory cannot attribute a vulnerable entry', () => {
  // Directly: a high entry whose only advisory is info.
  const direct = evaluateAudit(
    report({
      x: {
        severity: 'high',
        via: [
          advisory(
            'x',
            'https://github.com/advisories/GHSA-nnnn-oooo-pppp',
            'info'
          ),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(direct.ok, false);
  assert.match(direct.failures[0], /x \(high\): no advisory reachable/);
  assert.deepEqual(direct.allowed, []);

  // Transitively: a high dependent whose chain ends only in an info advisory.
  const transitive = evaluateAudit(
    report({
      leaf: {
        severity: 'info',
        via: [
          advisory(
            'leaf',
            'https://github.com/advisories/GHSA-nnnn-oooo-pppp',
            'info'
          ),
        ],
      },
      dependent: { severity: 'high', via: ['leaf'] },
    }),
    allow,
    NOW
  );
  assert.equal(transitive.ok, false);
  assert.match(
    transitive.failures[0],
    /dependent \(high\): no advisory reachable/
  );

  // An info advisory alongside an actionable allowlisted one still passes.
  const mixed = evaluateAudit(
    report({
      picomatch: {
        severity: 'high',
        via: [
          advisory(
            'picomatch',
            'https://github.com/advisories/GHSA-nnnn-oooo-pppp',
            'info'
          ),
          advisory('picomatch', PICO_URL),
        ],
      },
    }),
    allow,
    NOW
  );
  assert.equal(mixed.ok, true, mixed.failures.join('\n'));
});

test('allowed log lines include the advisory title', () => {
  const r = evaluateAudit(
    report({
      picomatch: { severity: 'high', via: [advisory('picomatch', PICO_URL)] },
    }),
    allow,
    NOW
  );
  assert.match(r.allowed[0], /picomatch bug — allowlisted until 2027-02-17/);
});

// ---------------------------------------------------------------------------
// runGate: spawn -> parse -> evaluate -> exit code wiring.
// ---------------------------------------------------------------------------

const gate = (spawnResultOrThrow, allowlist = allow) => {
  const out = [];
  const err = [];
  const calls = [];
  const code = runGate({
    allowlist,
    now: NOW,
    log: m => out.push(m),
    error: m => err.push(m),
    spawn: (cmd, args) => {
      calls.push([cmd, ...args]);
      if (spawnResultOrThrow instanceof Error) throw spawnResultOrThrow;
      return spawnResultOrThrow;
    },
  });
  return { code, out: out.join('\n'), err: err.join('\n'), calls };
};

test('runGate runs npm audit --json and exits 0 on a clean report', () => {
  const g = gate(spawnResult({}));
  assert.equal(g.code, 0);
  assert.deepEqual(g.calls, [['npm', 'audit', '--json']]);
  assert.match(g.out, /npm audit gate passed/);
});

test('runGate exits 0 when only allowlisted advisories remain', () => {
  const g = gate(
    spawnResult({
      status: 1,
      stdout: JSON.stringify(
        report(
          {
            picomatch: {
              severity: 'high',
              via: [advisory('picomatch', PICO_URL)],
            },
          },
          1
        )
      ),
    })
  );
  assert.equal(g.code, 0, g.err);
  assert.match(g.out, /allowed: picomatch GHSA-fc5q-39xc-vjpf/);
});

test('regression: runGate exits 1 on empty npm output', () => {
  const g = gate(spawnResult({ stdout: '' }));
  assert.equal(g.code, 1);
  assert.match(g.err, /printed no output/);
  assert.doesNotMatch(g.out, /passed/);
});

test('runGate exits 1 on spawn errors, thrown or returned', () => {
  assert.equal(
    gate(spawnResult({ error: new Error('ENOENT'), stdout: '', status: null }))
      .code,
    1
  );
  const thrown = gate(new Error('boom'));
  assert.equal(thrown.code, 1);
  assert.match(thrown.err, /Failed to run npm audit: boom/);
});

test('runGate exits 1 on an unallowlisted advisory', () => {
  const g = gate(
    spawnResult({
      status: 1,
      stdout: JSON.stringify(
        report({
          x: {
            severity: 'high',
            via: [
              advisory(
                'x',
                'https://github.com/advisories/GHSA-kkkk-llll-mmmm'
              ),
            ],
          },
        })
      ),
    })
  );
  assert.equal(g.code, 1);
  assert.match(g.err, /GHSA-kkkk-llll-mmmm/);
});

test('runGate warns about unused allowlist entries', () => {
  const g = gate(spawnResult({}));
  assert.match(
    g.out,
    /::warning::Allowlist entry picomatch GHSA-fc5q-39xc-vjpf/
  );
});
