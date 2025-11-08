#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

let coveragePath;
let testLogPath;
let jsonOutputPath;
let markdownOutputPath;
let printComment = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--coverage':
      coveragePath = args[++i];
      break;
    case '--test-log':
      testLogPath = args[++i];
      break;
    case '--print-comment':
      printComment = true;
      break;
    case '--json-output':
      jsonOutputPath = args[++i];
      break;
    case '--markdown-output':
      markdownOutputPath = args[++i];
      break;
    default:
      console.warn(`Unknown argument: ${arg}`);
  }
}

const stripAnsi = text =>
  text.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    ''
  );

const readJson = filePath => {
  if (!filePath) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const readText = filePath => {
  if (!filePath) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

const parseSummaryLine = (line, label) => {
  const summary = {
    failed: 0,
    passed: 0,
    skipped: 0,
    total: 0,
  };

  if (!line) {
    return summary;
  }

  const cleaned = stripAnsi(line)
    .replace(`${label}:`, '')
    .trim();

  cleaned.split(',').forEach(token => {
    const match = token.trim().match(/(\d+)\s+([a-zA-Z]+)/);
    if (!match) {
      return;
    }
    const count = Number.parseInt(match[1], 10);
    const descriptor = match[2].toLowerCase();
    if (descriptor.startsWith('fail')) {
      summary.failed = count;
    } else if (descriptor.startsWith('pass')) {
      summary.passed = count;
    } else if (descriptor.startsWith('skip')) {
      summary.skipped = count;
    } else if (descriptor.startsWith('total')) {
      summary.total = count;
    }
  });

  return summary;
};

const coverageData = readJson(coveragePath);

const extractCoverageRows = data => {
  if (!data) {
    return [];
  }

  const total = data.total || data;
  const metrics = ['statements', 'branches', 'functions', 'lines'];

  return metrics
    .map(metric => {
      const metricData = total[metric];
      if (
        !metricData ||
        typeof metricData.covered !== 'number' ||
        typeof metricData.total !== 'number'
      ) {
        return null;
      }

      const pct =
        typeof metricData.pct === 'number'
          ? metricData.pct
          : metricData.total > 0
            ? (metricData.covered / metricData.total) * 100
            : 0;

      return {
        metric,
        covered: metricData.covered,
        total: metricData.total,
        pct,
      };
    })
    .filter(Boolean);
};

const testLog = readText(testLogPath);
const testLogLines = testLog ? stripAnsi(testLog).split(/\r?\n/) : [];

const failingSuites = testLogLines
  .filter(line => line.startsWith('FAIL '))
  .map(line => line.replace(/^FAIL\s+/, '').trim());

const passingSuites = testLogLines.filter(line => line.startsWith('PASS '));

const findBestSummary = (prefix, label) => {
  let bestSummary = {
    failed: 0,
    passed: 0,
    skipped: 0,
    total: 0,
  };
  let bestTotal = -1;

  testLogLines.forEach(line => {
    if (line.startsWith(prefix)) {
      const summary = parseSummaryLine(line, label);
      if (summary.total >= bestTotal) {
        bestSummary = summary;
        bestTotal = summary.total;
      }
    }
  });

  return bestSummary;
};

const testSuitesSummary = findBestSummary('Test Suites:', 'Test Suites');
const testsSummary = findBestSummary('Tests:', 'Tests');

const coverageRows = extractCoverageRows(coverageData);

const marker = '<!-- coverage-comment -->';
const commentLines = [marker, '### CI Coverage & Test Summary', ''];

if (coverageRows.length > 0) {
  commentLines.push('| Metric | Coverage | Covered / Total |');
  commentLines.push('| --- | --- | --- |');
  coverageRows.forEach(row => {
    const label = row.metric[0].toUpperCase() + row.metric.slice(1);
    commentLines.push(
      `| ${label} | ${row.pct.toFixed(2)}% | ${row.covered} / ${row.total} |`
    );
  });
  commentLines.push('');
} else {
  commentLines.push(
    '_Coverage summary not available (tests may have failed before generating coverage)._',
    ''
  );
}

const summaryParts = [];
if (testSuitesSummary.total) {
  summaryParts.push(
    `Suites: ${testSuitesSummary.passed} passed, ${testSuitesSummary.failed} failed (${testSuitesSummary.total} total)`
  );
}
if (testsSummary.total) {
  summaryParts.push(
    `Tests: ${testsSummary.passed} passed, ${testsSummary.failed} failed (${testsSummary.total} total)`
  );
}

if (summaryParts.length > 0) {
  commentLines.push(summaryParts.join(' · '), '');
}

if (failingSuites.length > 0) {
  commentLines.push('#### ❌ Failing Suites', '');
  failingSuites.forEach(entry => {
    commentLines.push(`- ${entry}`);
  });
  commentLines.push('');
} else if (passingSuites.length > 0 && summaryParts.length > 0) {
  commentLines.push('✅ All reported test suites passed.', '');
}

commentLines.push(
  '_Coverage artifacts: `coverage-summary`, `coverage-packages`._'
);

const comment = commentLines.join('\n');

const result = {
  coverage: coverageRows,
  tests: {
    suites: testSuitesSummary,
    tests: testsSummary,
    failingSuites,
  },
  comment,
};

if (jsonOutputPath) {
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, JSON.stringify(result, null, 2), 'utf8');
}

if (markdownOutputPath) {
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
  fs.writeFileSync(markdownOutputPath, comment, 'utf8');
}

if (printComment) {
  process.stdout.write(`${comment}\n`);
}

if (!jsonOutputPath && !markdownOutputPath) {
  process.stdout.write(JSON.stringify(result));
}

