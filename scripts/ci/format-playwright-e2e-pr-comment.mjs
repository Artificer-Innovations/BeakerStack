#!/usr/bin/env node

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- e2e-web-results -->';

/**
 * @param {import('@playwright/test/reporter').JSONReport} report
 */
export function parsePlaywrightJson(report) {
  /** @type {Array<{ file: string, title: string, status: 'passed' | 'passedAfterRetry' | 'skipped' | 'failed', durationMs: number }>} */
  const cases = [];

  /**
   * @param {import('@playwright/test/reporter').JSONReportSuite} suite
   * @param {string[]} titlePath
   */
  function isFileLikeTitle(title, file) {
    return (
      title === file || title.endsWith('.spec.ts') || title.endsWith('.spec.js')
    );
  }

  function walkSuite(suite, titlePath) {
    const nextPath =
      suite.title &&
      suite.title.trim().length > 0 &&
      !isFileLikeTitle(suite.title, suite.file ?? '')
        ? [...titlePath, suite.title]
        : titlePath;

    for (const spec of suite.specs ?? []) {
      const test = spec.tests?.[0];
      const results = test?.results ?? [];
      const durationMs = results.reduce(
        (sum, result) => sum + (result.duration ?? 0),
        0
      );
      const last = results.at(-1);
      let status = 'failed';

      if (!last || results.length === 0) {
        status = 'skipped';
      } else if (last.status === 'skipped') {
        status = 'skipped';
      } else if (last.status === 'passed' || last.status === 'expected') {
        const failedAttempt = results.some(
          result =>
            result.status === 'failed' ||
            result.status === 'timedOut' ||
            result.status === 'interrupted'
        );
        status =
          failedAttempt && results.length > 1 ? 'passedAfterRetry' : 'passed';
      }

      cases.push({
        file: suite.file ?? 'unknown.spec.ts',
        title: [...nextPath, spec.title].filter(Boolean).join(' › '),
        status,
        durationMs,
      });
    }

    for (const child of suite.suites ?? []) {
      walkSuite(child, nextPath);
    }
  }

  for (const suite of report.suites ?? []) {
    walkSuite(suite, []);
  }

  const summary = {
    passed: cases.filter(c => c.status === 'passed').length,
    passedAfterRetry: cases.filter(c => c.status === 'passedAfterRetry').length,
    skipped: cases.filter(c => c.status === 'skipped').length,
    failed: cases.filter(c => c.status === 'failed').length,
    totalDurationMs: report.stats?.duration ?? 0,
  };

  return { cases, summary };
}

/** @param {number} durationMs */
export function formatMinutes(durationMs) {
  return `${(durationMs / 60_000).toFixed(2)} min`;
}

/** Background for full-width spec file section rows in the Details HTML table. */
export const FILE_SECTION_ROW_BG = '#eaeef2';

/** @param {string} value */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {ReturnType<typeof parsePlaywrightJson>['cases']} cases
 */
export function buildDetailsTable(cases) {
  const byFile = new Map();
  for (const testCase of cases) {
    const fileName = testCase.file;
    if (!byFile.has(fileName)) {
      byFile.set(fileName, []);
    }
    byFile.get(fileName).push(testCase);
  }

  if (byFile.size === 0) {
    return '_No individual test results available._';
  }

  const rows = [
    '<table>',
    '<thead>',
    '<tr>',
    '<th align="left">Test</th>',
    '<th align="left">Status</th>',
    '<th align="left">Duration</th>',
    '</tr>',
    '</thead>',
    '<tbody>',
  ];

  for (const [fileName, fileCases] of [...byFile.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    rows.push(
      '<tr>',
      `<td colspan="3" bgcolor="${FILE_SECTION_ROW_BG}"><strong>${escapeHtml(fileName)}</strong></td>`,
      '</tr>'
    );
    for (const testCase of fileCases) {
      const statusLabel =
        testCase.status === 'passedAfterRetry'
          ? 'passed after retry'
          : testCase.status;
      rows.push(
        '<tr>',
        `<td>${escapeHtml(testCase.title)}</td>`,
        `<td>${escapeHtml(statusLabel)}</td>`,
        `<td>${escapeHtml(formatMinutes(testCase.durationMs))}</td>`,
        '</tr>'
      );
    }
  }

  rows.push('</tbody>', '</table>');
  return rows.join('\n');
}

/**
 * @param {{
 *   cases: ReturnType<typeof parsePlaywrightJson>['cases'],
 *   summary: ReturnType<typeof parsePlaywrightJson>['summary'],
 *   webUrl: string,
 *   runUrl?: string,
 *   workflowOutcome?: string,
 * }} input
 */
export function buildComment({
  cases,
  summary,
  webUrl,
  runUrl,
  workflowOutcome,
}) {
  const lines = [
    MARKER,
    '# End 2 End - Test Results',
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '| --- | --- |',
    `| ✅ Passed | ${summary.passed} |`,
    `| ☑️ Passed after retry | ${summary.passedAfterRetry} |`,
    `| ⚠️ Skipped | ${summary.skipped} |`,
    `| ❌ Failed | ${summary.failed} |`,
    `| ⏱️ Total Duration | ${formatMinutes(summary.totalDurationMs)} |`,
    '',
    '## Test Environment',
    '',
    `🌐 Domain: ${webUrl}`,
    '',
  ];

  if (runUrl) {
    lines.push(`[View workflow run](${runUrl})`, '');
  }

  if (workflowOutcome && workflowOutcome !== 'success' && cases.length === 0) {
    lines.push(
      `> Playwright step outcome: **${workflowOutcome}** (no test report was produced).`,
      ''
    );
  }

  lines.push('## Details', '', buildDetailsTable(cases), '');

  return lines.join('\n');
}

export function loadReport(jsonPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  /** @type {{ json?: string, webUrl?: string, runUrl?: string, workflowOutcome?: string, markdownOutput?: string }} */
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--json':
        options.json = argv[++i];
        break;
      case '--web-url':
        options.webUrl = argv[++i];
        break;
      case '--run-url':
        options.runUrl = argv[++i];
        break;
      case '--workflow-outcome':
        options.workflowOutcome = argv[++i];
        break;
      case '--markdown-output':
        options.markdownOutput = argv[++i];
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const webUrl = options.webUrl ?? process.env.WEB_URL ?? 'unknown';
  const runUrl = options.runUrl ?? process.env.RUN_URL;
  const workflowOutcome =
    options.workflowOutcome ?? process.env.PLAYWRIGHT_OUTCOME;
  const jsonPath =
    options.json ??
    process.env.PLAYWRIGHT_JSON_REPORT ??
    'tests/e2e/web/results/web-results.json';

  const report = loadReport(jsonPath);
  const parsed = report
    ? parsePlaywrightJson(report)
    : {
        cases: [],
        summary: {
          passed: 0,
          passedAfterRetry: 0,
          skipped: 0,
          failed: 0,
          totalDurationMs: 0,
        },
      };

  const body = buildComment({
    ...parsed,
    webUrl,
    runUrl,
    workflowOutcome,
  });

  if (options.markdownOutput) {
    fs.writeFileSync(options.markdownOutput, body);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `body<<EOF\n${body}\nEOF\n`);
  } else {
    process.stdout.write(`${body}\n`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
