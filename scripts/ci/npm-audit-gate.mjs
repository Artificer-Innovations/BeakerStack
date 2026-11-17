/**
 * npm audit gate with a time-boxed advisory allowlist (library).
 *
 * The CI entry point is scripts/ci/npm-audit-allowlist.mjs, which always runs
 * `runGate()`. This module has no side effects on import so tests can exercise
 * every path, including the spawn -> parse -> evaluate -> exit-code wiring.
 *
 * The gate fails unless every advisory `npm audit --json` reports is listed in
 * ALLOWLIST (matched by GHSA id AND package name) and not past its `expires`
 * date. Advisory objects are checked directly wherever they appear, and every
 * vulnerable entry must reach at least one advisory through its `via` chain,
 * so dependency cycles (vitest <-> @vitest/coverage-v8, metro <-> metro-config)
 * can neither hide an advisory nor pass without one.
 *
 * Fails closed when:
 *   - npm could not be run, was killed, or exited with an unexpected status
 *   - npm audit printed nothing, unparseable output, or an error payload
 *   - the report has no `vulnerabilities` map, or the map is empty while
 *     `metadata.vulnerabilities.total` says there are findings
 *   - an entry or advisory has a missing or unrecognized severity
 *   - a vulnerable entry reaches no advisory (no `via`, a `via` naming a package
 *     missing from the report, or an advisory-free cycle)
 *   - an advisory is not allowlisted, or its allowlist entry has expired
 *
 * Every exception must also be documented in SECURITY.md.
 */

import { spawnSync } from 'node:child_process';

/**
 * @typedef {{ id: string, package: string, expires: string, reason: string }} AllowEntry
 * @type {AllowEntry[]}
 */
export const ALLOWLIST = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    package: 'picomatch',
    expires: '2027-02-17',
    reason:
      'ReDoS needs an attacker-controlled glob pattern. We only pass repo-owned config globs ' +
      '(Jest/Vitest/Vite/Metro/Tailwind/lint-staged), none with the vulnerable shape, and only ' +
      'in build, test and dev tools. No patched release exists yet; pin it in root overrides once ' +
      'upstream ships one, then remove this entry.',
  },
];

// `info` is npm's non-vulnerability tier (`npm audit --audit-level=low` never
// fails on it), so info-severity advisories and entries don't fail the gate.
// Advisories are still checked even when their entry is marked info, and any
// other or missing severity fails closed.
const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);

/** GHSA id from an advisory URL such as https://github.com/advisories/GHSA-xxxx-xxxx-xxxx */
export function ghsaIdFromUrl(url) {
  const m =
    typeof url === 'string'
      ? url.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i)
      : null;
  return m ? `GHSA-${m[0].slice(5).toLowerCase()}` : null;
}

/**
 * Turn a `spawnSync('npm', ['audit', '--json'])` result into a parsed report,
 * failing closed on anything other than a JSON object printed by an npm that
 * exited normally. npm audit exits 1 whenever it finds vulnerabilities, so 0
 * and 1 are both expected; any other status, a signal, or a spawn error is not.
 *
 * @param {{ error?: Error, signal?: string | null, status?: number | null, stdout?: string | null, stderr?: string | null }} res
 * @returns {{ ok: true, report: any } | { ok: false, failure: string }}
 */
export function readAuditReport(res) {
  const stderr = res?.stderr ? `\n${String(res.stderr).slice(0, 2000)}` : '';
  if (!res) return { ok: false, failure: 'npm audit did not run' };
  if (res.error) {
    return {
      ok: false,
      failure: `Failed to run npm audit: ${res.error.message}${stderr}`,
    };
  }
  if (res.signal) {
    return {
      ok: false,
      failure: `npm audit was killed by ${res.signal}${stderr}`,
    };
  }
  if (res.status !== 0 && res.status !== 1) {
    return {
      ok: false,
      failure: `npm audit exited with unexpected status ${res.status}${stderr}`,
    };
  }
  const stdout = typeof res.stdout === 'string' ? res.stdout.trim() : '';
  if (stdout === '') {
    return { ok: false, failure: `npm audit printed no output${stderr}` };
  }
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return {
      ok: false,
      failure: `Could not parse npm audit --json output:\n${stdout.slice(0, 2000)}${stderr}`,
    };
  }
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { ok: false, failure: 'npm audit output is not a JSON object' };
  }
  return { ok: true, report };
}

/**
 * Evaluate an `npm audit --json` report against an allowlist.
 * @param {any} report
 * @param {AllowEntry[]} allowlist
 * @param {Date} now
 * @returns {{ ok: boolean, failures: string[], allowed: string[], unused: string[] }}
 */
export function evaluateAudit(report, allowlist, now = new Date()) {
  const fail = message => ({
    ok: false,
    failures: [message],
    allowed: [],
    unused: [],
  });

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return fail('npm audit output is not a JSON object');
  }
  if (report.error) {
    const detail =
      report.error.summary || report.error.code || JSON.stringify(report.error);
    return fail(`npm audit reported an error: ${detail}`);
  }
  const vulns = report.vulnerabilities;
  if (!vulns || typeof vulns !== 'object' || Array.isArray(vulns)) {
    return fail('npm audit output has no "vulnerabilities" map');
  }
  const total = report.metadata?.vulnerabilities?.total;
  if (
    typeof total === 'number' &&
    total > 0 &&
    Object.keys(vulns).length === 0
  ) {
    return fail(
      `npm audit metadata reports ${total} vulnerabilities but the "vulnerabilities" map is empty`
    );
  }

  const failures = [];
  const allowed = new Set();
  const used = new Set();
  const today = now.toISOString().slice(0, 10);
  /** Packages whose own `via` holds at least one advisory object. */
  const hasAdvisory = new Set();
  /** Non-info entries that must reach an advisory. */
  const vulnerable = [];

  for (const [name, entry] of Object.entries(vulns)) {
    if (!entry || typeof entry !== 'object') {
      failures.push(`${name}: unrecognized entry ${JSON.stringify(entry)}`);
      continue;
    }
    if (!SEVERITIES.has(entry.severity)) {
      failures.push(
        `${name}: missing or unrecognized severity ${JSON.stringify(entry.severity)}`
      );
      continue;
    }
    if (entry.severity !== 'info') vulnerable.push(name);
    const via = Array.isArray(entry.via) ? entry.via : [];
    for (const v of via) {
      if (typeof v === 'string') {
        if (!(v in vulns))
          failures.push(
            `${name}: depends on "${v}", which is missing from the report`
          );
        continue;
      }
      if (!v || typeof v !== 'object') {
        failures.push(`${name}: unrecognized via entry ${JSON.stringify(v)}`);
        continue;
      }
      hasAdvisory.add(name);
      const pkg = v.name || name;
      if (!SEVERITIES.has(v.severity)) {
        failures.push(
          `${pkg} ${v.url ?? v.source ?? '(unknown advisory)'}: missing or unrecognized severity ${JSON.stringify(v.severity)}`
        );
        continue;
      }
      if (v.severity === 'info') continue;
      const id = ghsaIdFromUrl(v.url);
      const title = v.title ? ` — ${v.title}` : '';
      const label = `${pkg} ${id ?? v.url ?? v.source ?? '(unknown advisory)'} (${v.severity})`;
      const match = id && allowlist.find(a => a.id === id && a.package === pkg);
      if (!match) {
        failures.push(`${label}: not allowlisted${title}`);
      } else if (match.expires < today) {
        failures.push(
          `${label}: allowlist entry expired on ${match.expires}; re-review it${title}`
        );
      } else {
        used.add(`${match.package}@${match.id}`);
        allowed.add(`${label}${title} — allowlisted until ${match.expires}`);
      }
    }
  }

  // Every vulnerable entry must be attributable to an advisory reachable
  // through its `via` chain. A visited set makes the walk cycle-safe; an
  // advisory-free cycle (a.via = ['b'], b.via = ['a']) reaches nothing.
  const reachesAdvisory = start => {
    const seen = new Set();
    const stack = [start];
    while (stack.length > 0) {
      const name = stack.pop();
      if (seen.has(name)) continue;
      seen.add(name);
      if (hasAdvisory.has(name)) return true;
      const via = vulns[name]?.via;
      if (!Array.isArray(via)) continue;
      for (const v of via)
        if (typeof v === 'string' && v in vulns) stack.push(v);
    }
    return false;
  };
  for (const name of vulnerable) {
    if (!reachesAdvisory(name)) {
      failures.push(
        `${name} (${vulns[name].severity}): no advisory reachable through its dependency chain, so it can't be attributed`
      );
    }
  }

  const unused = allowlist
    .filter(a => !used.has(`${a.package}@${a.id}`))
    .map(a => `${a.package} ${a.id}`);

  return {
    ok: failures.length === 0,
    failures: [...new Set(failures)],
    allowed: [...allowed],
    unused,
  };
}

/**
 * Run `npm audit --json`, evaluate it, log the result, and return the process
 * exit code (0 only when the gate passes). Dependencies are injectable so the
 * full wiring is unit-tested.
 *
 * @param {{ allowlist?: AllowEntry[], spawn?: typeof spawnSync, log?: (msg: string) => void, error?: (msg: string) => void, now?: Date }} [deps]
 * @returns {0 | 1}
 */
export function runGate({
  allowlist = ALLOWLIST,
  spawn = spawnSync,
  log = console.log,
  error = console.error,
  now = new Date(),
} = {}) {
  let res;
  try {
    res = spawn('npm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    error(`::error::Failed to run npm audit: ${err?.message ?? err}`);
    return 1;
  }
  const read = readAuditReport(res);
  if (!read.ok) {
    error(`::error::${read.failure}`);
    return 1;
  }
  const { report } = read;

  const { ok, failures, allowed, unused } = evaluateAudit(
    report,
    allowlist,
    now
  );
  const counts = report.metadata?.vulnerabilities;
  if (counts) log(`npm audit totals: ${JSON.stringify(counts)}`);
  for (const a of allowed) log(`allowed: ${a}`);
  for (const u of unused) {
    log(
      `::warning::Allowlist entry ${u} no longer matches any advisory; remove it from scripts/ci/npm-audit-gate.mjs and SECURITY.md`
    );
  }
  if (!ok) {
    for (const f of failures) error(`::error::${f}`);
    error(`npm audit gate failed: ${failures.length} problem(s).`);
    return 1;
  }
  log('npm audit gate passed.');
  return 0;
}
