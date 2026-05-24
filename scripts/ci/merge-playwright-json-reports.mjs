#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {import('@playwright/test/reporter').JSONReport[]} reports
 * @returns {import('@playwright/test/reporter').JSONReport}
 */
export function mergePlaywrightJsonReports(reports) {
  const merged = {
    config: reports[0]?.config ?? {},
    suites: [],
    errors: [],
    stats: {
      startTime: reports[0]?.stats?.startTime ?? new Date().toISOString(),
      duration: 0,
      expected: 0,
      unexpected: 0,
      flaky: 0,
      skipped: 0,
    },
  };

  for (const report of reports) {
    merged.suites.push(...(report.suites ?? []));
    merged.errors.push(...(report.errors ?? []));
    merged.stats.duration += report.stats?.duration ?? 0;
    merged.stats.expected += report.stats?.expected ?? 0;
    merged.stats.unexpected += report.stats?.unexpected ?? 0;
    merged.stats.flaky += report.stats?.flaky ?? 0;
    merged.stats.skipped += report.stats?.skipped ?? 0;
  }

  return merged;
}

function parseArgs(argv) {
  /** @type {{ inputs: string[], output?: string }} */
  const options = { inputs: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output' || arg === '-o') {
      options.output = argv[++i];
      continue;
    }
    if (arg.startsWith('-')) {
      console.warn(`Unknown argument: ${arg}`);
      continue;
    }
    options.inputs.push(arg);
  }

  return options;
}

function loadReport(jsonPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputPath =
    options.output ??
    process.env.PLAYWRIGHT_JSON_REPORT ??
    'tests/e2e/web/results/web-results.json';

  const inputPaths =
    options.inputs.length > 0
      ? options.inputs
      : (process.env.PLAYWRIGHT_JSON_REPORTS ?? '')
          .split(':')
          .map(value => value.trim())
          .filter(Boolean);

  const reports = inputPaths.map(loadReport).filter(report => report !== null);

  if (reports.length === 0) {
    console.warn('No Playwright JSON reports found to merge.');
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(mergePlaywrightJsonReports(reports), null, 2)
  );
  process.stdout.write(
    `Merged ${reports.length} Playwright JSON report(s) into ${outputPath}\n`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
