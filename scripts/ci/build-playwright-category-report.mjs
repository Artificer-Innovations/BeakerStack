#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  E2E_CATEGORIES,
  formatCategorySummaryLabel,
  summarizeByCategory,
} from './playwright-e2e-categories.mjs';
import {
  escapeHtml,
  formatMinutes,
  formatStatusLabel,
  loadReport,
  parsePlaywrightJson,
} from './format-playwright-e2e-pr-comment.mjs';

/**
 * @param {ReturnType<typeof parsePlaywrightJson>['cases']} cases
 * @param {ReturnType<typeof parsePlaywrightJson>['summary']} summary
 */
export function buildCategoryHtml(cases, summary) {
  const byCategory = summarizeByCategory(cases);
  const passedTotal = summary.passed + summary.passedAfterRetry;
  const grandTotal = passedTotal + summary.failed + summary.skipped;

  const sections = [];

  for (const category of [...E2E_CATEGORIES, 'other']) {
    if (!byCategory.has(category)) {
      continue;
    }

    const counts = byCategory.get(category);
    const categoryCases = cases
      .filter(testCase => testCase.category === category)
      .sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        return fileCompare !== 0 ? fileCompare : a.title.localeCompare(b.title);
      });

    const categoryPassed = counts.passed + counts.passedAfterRetry;
    const categoryTotal = categoryPassed + counts.failed + counts.skipped;
    const failedMarker = counts.failed > 0 ? ' data-has-failures="true"' : '';

    const testRows = categoryCases
      .map(testCase => {
        const displayTitle = `${testCase.file} › ${testCase.title}`;
        return `<tr>
  <td>${escapeHtml(displayTitle)}</td>
  <td>${escapeHtml(formatStatusLabel(testCase.status))}</td>
  <td>${escapeHtml(formatMinutes(testCase.durationMs))}</td>
</tr>`;
      })
      .join('\n');

    sections.push(`<details open class="category"${failedMarker}>
  <summary>
    <strong>${escapeHtml(category)}</strong>
    <span class="counts">${categoryPassed}/${categoryTotal} passed</span>
    <span class="meta">${escapeHtml(formatCategorySummaryLabel(counts))}</span>
  </summary>
  <table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Status</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
${testRows}
    </tbody>
  </table>
</details>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>E2E Results by Category</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #1f2328; }
    h1 { margin-bottom: 8px; }
    .summary { margin-bottom: 24px; color: #57606a; }
    details.category { border: 1px solid #d0d7de; border-radius: 8px; margin-bottom: 16px; padding: 12px 16px; }
    details.category[data-has-failures="true"] { border-color: #cf222e; }
    summary { cursor: pointer; display: flex; gap: 12px; align-items: baseline; }
    summary .counts { font-weight: 600; }
    summary .meta { color: #57606a; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 8px 10px; border-top: 1px solid #d0d7de; vertical-align: top; }
    th { background: #f6f8fa; font-size: 14px; }
    td:first-child { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  </style>
</head>
<body>
  <h1>E2E Results by Category</h1>
  <p class="summary">${passedTotal}/${grandTotal} tests passed · ${escapeHtml(formatMinutes(summary.totalDurationMs))} total</p>
  ${sections.join('\n')}
</body>
</html>`;
}

function parseArgs(argv) {
  /** @type {{ json?: string, output?: string }} */
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--json':
        options.json = argv[++i];
        break;
      case '--output':
        options.output = argv[++i];
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const jsonPath =
    options.json ??
    process.env.PLAYWRIGHT_JSON_REPORT ??
    'tests/e2e/web/results/web-results.json';
  const outputPath =
    options.output ??
    process.env.PLAYWRIGHT_CATEGORY_REPORT ??
    'tests/e2e/web/report/categories.html';

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

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    buildCategoryHtml(parsed.cases, parsed.summary),
    'utf8'
  );
  process.stdout.write(`Wrote category report to ${outputPath}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
