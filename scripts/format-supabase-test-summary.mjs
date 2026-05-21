#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);

let dbLogPath;
let integrationLogPath;
let migrationResult = 'skipped';
let markdownOutputPath;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--db-log':
      dbLogPath = args[++i];
      break;
    case '--integration-log':
      integrationLogPath = args[++i];
      break;
    case '--migration-result':
      migrationResult = args[++i];
      break;
    case '--markdown-output':
      markdownOutputPath = args[++i];
      break;
    default:
      console.warn(`Unknown argument: ${arg}`);
  }
}

export const MARKER = '<!-- supabase-tests-comment -->';
const MAX_EXCERPT_LINES = 25;
const MAX_EXCERPT_CHARS = 8000;

// eslint-disable-next-line no-control-regex
export const stripAnsi = text => text.replace(/\[[0-9;]*m/g, '');

export const readText = filePath => {
  if (!filePath) return '';
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

export function parsePgTap(rawLog) {
  const result = {
    ok: false,
    filesTotal: 0,
    filesPassed: 0,
    filesFailed: 0,
    testsTotal: 0,
    testsPassed: 0,
    testsFailed: 0,
    failingFiles: [],
    excerpt: '',
    available: false,
  };

  if (!rawLog || !rawLog.trim()) return result;
  result.available = true;

  const log = stripAnsi(rawLog);
  const lines = log.split(/\r?\n/);

  // Per-file lines: "path/to/file.sql .. ok" or "path/to/file.sql .. FAILED"
  const fileLineRe = /^(\S+\.sql)\s+\.+\s+(ok|FAILED)\s*$/;

  for (const line of lines) {
    const m = line.match(fileLineRe);
    if (m) {
      result.filesTotal++;
      if (m[2] === 'ok') {
        result.filesPassed++;
      } else {
        result.filesFailed++;
        result.failingFiles.push(m[1]);
      }
    }
  }

  // Aggregate: "Files=2, Tests=20, 3 wallclock secs"
  const aggregateLine = lines.find(l => /^Files=\d+/.test(l));
  if (aggregateLine) {
    const filesMatch = aggregateLine.match(/Files=(\d+)/);
    const testsMatch = aggregateLine.match(/Tests=(\d+)/);
    if (filesMatch) result.filesTotal = parseInt(filesMatch[1], 10);
    if (testsMatch) result.testsTotal = parseInt(testsMatch[1], 10);
  }

  // Overall result line
  const resultLine = lines.find(l => /^Result:\s+(PASS|FAIL)/.test(l));
  if (resultLine) {
    result.ok = /^Result:\s+PASS/.test(resultLine);
  } else {
    result.ok = result.filesFailed === 0 && result.filesTotal > 0;
  }

  // Count "not ok" assertions for failed test tally
  const notOkLines = lines.filter(l => /^\s*not ok\s+/.test(l));
  result.testsFailed = notOkLines.length;
  if (result.testsTotal > 0) {
    result.testsPassed = result.testsTotal - result.testsFailed;
  }

  // Failure excerpt: "not ok" assertions + "# Failed test" diagnostics
  if (result.failingFiles.length > 0) {
    const excerptLines = lines
      .filter(l => /^\s*(not ok\s+|#\s+(Failed test|at\s+))/.test(l))
      .slice(0, MAX_EXCERPT_LINES);
    result.excerpt = excerptLines.join('\n').slice(0, MAX_EXCERPT_CHARS);
  }

  return result;
}

export function parseJest(lines) {
  const result = {
    suitesTotal: 0,
    suitesPassed: 0,
    suitesFailed: 0,
    testsTotal: 0,
    testsPassed: 0,
    testsFailed: 0,
    failingSuites: [],
    ok: true,
    available: false,
  };

  const parseSummaryLine = (line, label) => {
    const cleaned = stripAnsi(line).replace(`${label}:`, '').trim();
    const out = { failed: 0, passed: 0, skipped: 0, total: 0 };
    cleaned.split(',').forEach(token => {
      const m = token.trim().match(/(\d+)\s+([a-zA-Z]+)/);
      if (!m) return;
      const count = parseInt(m[1], 10);
      const desc = m[2].toLowerCase();
      if (desc.startsWith('fail')) out.failed = count;
      else if (desc.startsWith('pass')) out.passed = count;
      else if (desc.startsWith('skip') || desc.startsWith('todo')) {
        /* intentionally ignored */
      } else if (desc.startsWith('total')) out.total = count;
    });
    if (!out.total) out.total = out.failed + out.passed + out.skipped;
    return out;
  };

  let bestSuites = null;
  let bestSuitesTotal = -1;
  let bestTests = null;
  let bestTestsTotal = -1;

  for (const line of lines) {
    const stripped = stripAnsi(line);
    if (stripped.startsWith('Test Suites:')) {
      result.available = true;
      const s = parseSummaryLine(stripped, 'Test Suites');
      if (s.total >= bestSuitesTotal) {
        bestSuites = s;
        bestSuitesTotal = s.total;
      }
    }
    if (stripped.startsWith('Tests:')) {
      const s = parseSummaryLine(stripped, 'Tests');
      if (s.total >= bestTestsTotal) {
        bestTests = s;
        bestTestsTotal = s.total;
      }
    }
    if (stripped.startsWith('FAIL ')) {
      const suite = stripped.replace(/^FAIL\s+/, '').trim();
      if (suite && !result.failingSuites.includes(suite)) {
        result.failingSuites.push(suite);
        result.available = true;
      }
    }
  }

  if (bestSuites) {
    result.suitesTotal = bestSuites.total;
    result.suitesPassed = bestSuites.passed;
    result.suitesFailed = bestSuites.failed;
  }
  if (bestTests) {
    result.testsTotal = bestTests.total;
    result.testsPassed = bestTests.passed;
    result.testsFailed = bestTests.failed;
  }

  result.ok = result.suitesFailed === 0 && result.failingSuites.length === 0;
  return result;
}

export function parseVitest(lines) {
  const result = {
    filesTotal: 0,
    filesPassed: 0,
    filesFailed: 0,
    testsTotal: 0,
    testsPassed: 0,
    testsFailed: 0,
    failingFiles: [],
    ok: true,
    available: false,
  };

  for (const line of lines) {
    const stripped = stripAnsi(line);

    // Vitest FAIL lines start with whitespace: " FAIL  path/to/test.ts"
    // Jest FAIL lines start at column 0 — exclude those.
    if (/^\s+FAIL\s+\S+\.(test|spec)\.(ts|tsx|js|jsx|mts|mjs)/.test(stripped)) {
      const m = stripped.trim().match(/^FAIL\s+(\S+)/);
      if (m && !result.failingFiles.includes(m[1])) {
        result.failingFiles.push(m[1]);
        result.available = true;
      }
    }

    // " Test Files  1 failed | 2 passed (3)"
    const filesSummary = stripped.match(
      /Test Files\s+(?:(\d+)\s+failed\s*\|?\s*)?(?:(\d+)\s+passed\s*)?\((\d+)\)/
    );
    if (filesSummary) {
      result.filesFailed = parseInt(filesSummary[1] || '0', 10);
      result.filesPassed = parseInt(filesSummary[2] || '0', 10);
      result.filesTotal = parseInt(filesSummary[3], 10);
      result.available = true;
    }

    // " Tests  2 failed | 3 passed (5)" — must not match "Test Files" line
    const testsSummary = stripped.match(
      /^\s+Tests\s+(?:(\d+)\s+failed\s*\|?\s*)?(?:(\d+)\s+passed\s*)?\((\d+)\)/
    );
    if (testsSummary) {
      result.testsFailed = parseInt(testsSummary[1] || '0', 10);
      result.testsPassed = parseInt(testsSummary[2] || '0', 10);
      result.testsTotal = parseInt(testsSummary[3], 10);
    }
  }

  result.ok = result.filesFailed === 0 && result.failingFiles.length === 0;
  return result;
}

export function buildComment({ pgtap, jest, vitest, migrationResult: migResult }) {
  const lines = [MARKER, '### DB & Integration Test Summary', ''];

  const migStatus =
    migResult === 'success'
      ? '✅ Pass'
      : migResult === 'failure'
        ? '❌ Fail'
        : '— (skipped)';

  lines.push('| Check | Status |');
  lines.push('| --- | --- |');
  lines.push(`| Migration filename format | ${migStatus} |`);
  lines.push('');

  // pgTAP section
  if (pgtap.available) {
    const dbStatus = pgtap.ok ? '✅ Pass' : '❌ Fail';
    lines.push(`#### Database tests (pgTAP) — ${dbStatus}`, '');

    const parts = [];
    if (pgtap.filesTotal > 0) {
      parts.push(`${pgtap.filesPassed}/${pgtap.filesTotal} files passed`);
    }
    if (pgtap.testsTotal > 0) {
      parts.push(`${pgtap.testsPassed}/${pgtap.testsTotal} assertions passed`);
    }
    if (parts.length > 0) lines.push(parts.join(' · '), '');

    if (pgtap.failingFiles.length > 0) {
      lines.push('**Failing files:**', '');
      pgtap.failingFiles.forEach(f => lines.push(`- \`${f}\``));
      lines.push('');
      if (pgtap.excerpt) {
        lines.push('<details><summary>Failure details</summary>', '');
        lines.push('```');
        lines.push(pgtap.excerpt);
        lines.push('```');
        lines.push('</details>', '');
      }
    }
  } else {
    lines.push('#### Database tests (pgTAP)', '');
    lines.push('_Log not available._', '');
  }

  // Jest section
  if (jest.available) {
    const jestStatus = jest.ok ? '✅ Pass' : '❌ Fail';
    lines.push(`#### Integration tests (Jest) — ${jestStatus}`, '');

    const parts = [];
    if (jest.suitesTotal > 0) {
      parts.push(`${jest.suitesPassed}/${jest.suitesTotal} suites passed`);
    }
    if (jest.testsTotal > 0) {
      parts.push(`${jest.testsPassed}/${jest.testsTotal} tests passed`);
    }
    if (parts.length > 0) lines.push(parts.join(' · '), '');

    if (jest.failingSuites.length > 0) {
      lines.push('**Failing suites:**', '');
      jest.failingSuites.forEach(s => lines.push(`- \`${s}\``));
      lines.push('');
    }
  }

  // Vitest section
  if (vitest.available) {
    const vitestStatus = vitest.ok ? '✅ Pass' : '❌ Fail';
    lines.push(`#### Live Supabase client (Vitest) — ${vitestStatus}`, '');

    const parts = [];
    if (vitest.filesTotal > 0) {
      parts.push(`${vitest.filesPassed}/${vitest.filesTotal} files passed`);
    }
    if (vitest.testsTotal > 0) {
      parts.push(`${vitest.testsPassed}/${vitest.testsTotal} tests passed`);
    }
    if (parts.length > 0) lines.push(parts.join(' · '), '');

    if (vitest.failingFiles.length > 0) {
      lines.push('**Failing files:**', '');
      vitest.failingFiles.forEach(f => lines.push(`- \`${f}\``));
      lines.push('');
    }
  }

  lines.push('_Full logs: `db-tests-log`, `integration-log` artifacts._');

  return lines.join('\n');
}

// Run CLI logic only when invoked directly
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const dbLog = readText(dbLogPath);
  const integrationLog = readText(integrationLogPath);
  const integrationLines = stripAnsi(integrationLog).split(/\r?\n/);

  const pgtap = parsePgTap(dbLog);
  const jest = parseJest(integrationLines);
  const vitest = parseVitest(integrationLines);

  const comment = buildComment({ pgtap, jest, vitest, migrationResult });

  if (markdownOutputPath) {
    fs.mkdirSync(path.dirname(path.resolve(markdownOutputPath)), { recursive: true });
    fs.writeFileSync(markdownOutputPath, comment, 'utf8');
  } else {
    process.stdout.write(`${comment}\n`);
  }
}
