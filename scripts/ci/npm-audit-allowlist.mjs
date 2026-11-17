#!/usr/bin/env node
/**
 * npm audit gate with a time-boxed advisory allowlist.
 *
 * Runs `npm audit --json` and fails unless every advisory it reports is listed
 * in ALLOWLIST below (matched by GHSA id AND package name) and not past its
 * `expires` date. Transitive entries (`via` holding package names) only relay
 * advisories reported elsewhere in the same report, so the gate checks the
 * advisory objects directly instead of walking the dependency graph. That way
 * dependency cycles (vitest <-> @vitest/coverage-v8, metro <-> metro-config)
 * can't hide or invent a root cause.
 *
 * Fails closed when:
 *   - npm audit returns an error payload or unparseable output
 *   - an entry has no advisory and no `via` (no way to attribute it)
 *   - an entry's `via` names a package missing from the report
 *   - an advisory is not allowlisted, or its allowlist entry has expired
 *
 * Every exception must also be documented in SECURITY.md.
 *
 * Usage: node scripts/ci/npm-audit-allowlist.mjs
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const FAILING_SEVERITIES = new Set(['low', 'moderate', 'high', 'critical']);

/** GHSA id from an advisory URL such as https://github.com/advisories/GHSA-xxxx-xxxx-xxxx */
export function ghsaIdFromUrl(url) {
  const m =
    typeof url === 'string'
      ? url.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i)
      : null;
  return m ? `GHSA-${m[0].slice(5).toLowerCase()}` : null;
}

/**
 * Evaluate an `npm audit --json` report against an allowlist.
 * @param {any} report
 * @param {AllowEntry[]} allowlist
 * @param {Date} now
 * @returns {{ ok: boolean, failures: string[], allowed: string[], unused: string[] }}
 */
export function evaluateAudit(report, allowlist, now = new Date()) {
  const failures = [];
  const allowed = new Set();
  const used = new Set();

  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return {
      ok: false,
      failures: ['npm audit output is not a JSON object'],
      allowed: [],
      unused: [],
    };
  }
  if (report.error) {
    const detail =
      report.error.summary || report.error.code || JSON.stringify(report.error);
    return {
      ok: false,
      failures: [`npm audit reported an error: ${detail}`],
      allowed: [],
      unused: [],
    };
  }
  const vulns = report.vulnerabilities;
  if (!vulns || typeof vulns !== 'object') {
    return {
      ok: false,
      failures: ['npm audit output has no "vulnerabilities" map'],
      allowed: [],
      unused: [],
    };
  }

  const today = now.toISOString().slice(0, 10);

  for (const [name, entry] of Object.entries(vulns)) {
    if (!FAILING_SEVERITIES.has(entry?.severity)) continue;
    const via = Array.isArray(entry.via) ? entry.via : [];
    if (via.length === 0) {
      failures.push(
        `${name} (${entry.severity}): no advisory or dependency info to attribute it`
      );
      continue;
    }
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
      if (!FAILING_SEVERITIES.has(v.severity)) continue;
      const id = ghsaIdFromUrl(v.url);
      const pkg = v.name || name;
      const label = `${pkg} ${id ?? v.url ?? v.source ?? '(unknown advisory)'} (${v.severity})`;
      const match = id && allowlist.find(a => a.id === id && a.package === pkg);
      if (!match) {
        failures.push(
          `${label}: not allowlisted${v.title ? ` — ${v.title}` : ''}`
        );
      } else if (match.expires < today) {
        failures.push(
          `${label}: allowlist entry expired on ${match.expires}; re-review it`
        );
      } else {
        used.add(`${match.package}@${match.id}`);
        allowed.add(`${label} — allowlisted until ${match.expires}`);
      }
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

function main() {
  const res = spawnSync('npm', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) {
    console.error(`Failed to run npm audit: ${res.error.message}`);
    process.exit(1);
  }
  let report;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    console.error('Could not parse npm audit --json output:');
    console.error(res.stdout?.slice(0, 2000) || res.stderr);
    process.exit(1);
  }

  const { ok, failures, allowed, unused } = evaluateAudit(report, ALLOWLIST);
  const counts = report?.metadata?.vulnerabilities;
  if (counts) console.log(`npm audit totals: ${JSON.stringify(counts)}`);
  for (const a of allowed) console.log(`allowed: ${a}`);
  for (const u of unused) {
    console.log(
      `::warning::Allowlist entry ${u} no longer matches any advisory; remove it from scripts/ci/npm-audit-allowlist.mjs and SECURITY.md`
    );
  }
  if (!ok) {
    for (const f of failures) console.error(`::error::${f}`);
    console.error(`npm audit gate failed: ${failures.length} problem(s).`);
    process.exit(1);
  }
  console.log('npm audit gate passed.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
