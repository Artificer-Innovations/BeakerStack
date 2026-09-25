'use strict';

const fs = require('fs');
const path = require('path');
const {
  aggregateResultsByModule,
  calculateMetrics,
} = require('mutation-testing-metrics');

/**
 * Projects included in `npm run test:mutation`.
 * `dir` is the workspace path that contains `reports/mutation/mutation.json`.
 */
const MUTATION_TARGETS = [
  { name: 'admin', dir: 'packages/admin' },
  { name: 'articles', dir: 'packages/articles' },
  { name: 'billing', dir: 'packages/billing' },
  { name: 'connections', dir: 'packages/connections' },
  { name: 'email', dir: 'packages/email' },
  { name: 'help', dir: 'packages/help' },
  { name: 'lifecycle-events', dir: 'packages/lifecycle-events' },
  { name: 'logger', dir: 'packages/logger' },
  { name: 'marketing-email', dir: 'packages/marketing-email' },
  { name: 'observability', dir: 'packages/observability' },
  { name: 'waitlist', dir: 'packages/waitlist' },
  { name: 'waitlist-billing', dir: 'packages/waitlist-billing' },
  { name: 'web', dir: 'apps/web' },
  { name: 'mobile', dir: 'apps/mobile' },
];

const MUTATION_PACKAGES = MUTATION_TARGETS.map(target => target.name);

/**
 * @param {string} name
 */
function mutationReportDir(name) {
  const target = MUTATION_TARGETS.find(entry => entry.name === name);
  return target ? target.dir : path.join('packages', name);
}

/**
 * @param {import('mutation-testing-report-schema').MutationTestResult} report
 */
function summarizeReport(report) {
  const metrics = calculateMetrics(report.files || {}).metrics;
  return {
    mutationScore: Number.isFinite(metrics.mutationScore)
      ? metrics.mutationScore
      : null,
    killed: metrics.killed,
    timeout: metrics.timeout,
    survived: metrics.survived,
    noCoverage: metrics.noCoverage,
    runtimeErrors: metrics.runtimeErrors,
    compileErrors: metrics.compileErrors,
    totalDetected: metrics.totalDetected,
    totalValid: metrics.totalValid,
    totalMutants: metrics.totalMutants,
  };
}

/**
 * @param {Record<string, import('mutation-testing-report-schema').MutationTestResult>} resultsByModule
 */
function buildMergedMutationReport(resultsByModule) {
  const merged = aggregateResultsByModule(resultsByModule);
  const first = Object.values(resultsByModule)[0];
  if (first?.thresholds) {
    merged.thresholds = first.thresholds;
  }
  return merged;
}

/**
 * @param {Record<string, import('mutation-testing-report-schema').MutationTestResult>} resultsByModule
 * @param {string[]} missing
 */
function buildMutationSummary(resultsByModule, missing) {
  const merged = buildMergedMutationReport(resultsByModule);
  /** @type {Record<string, ReturnType<typeof summarizeReport>>} */
  const byPackage = {};
  for (const [name, report] of Object.entries(resultsByModule)) {
    byPackage[name] = summarizeReport(report);
  }

  return {
    merged,
    summary: {
      total: summarizeReport(merged),
      byPackage,
      missing,
    },
  };
}

/**
 * Break `<` inside the embedded JSON so the HTML parser does not close the script.
 * @param {string} json
 */
function escapeHtmlTags(json) {
  return json.replace(/</g, '<"+"');
}

/**
 * @param {import('mutation-testing-report-schema').MutationTestResult} report
 */
function renderMutationHtml(report) {
  const scriptContent = fs.readFileSync(
    require.resolve('mutation-testing-elements/dist/mutation-test-elements.js'),
    'utf8'
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BeakerStack mutation report</title>
  <script>
    ${scriptContent}
  </script>
</head>
<body>
  <mutation-test-report-app titlePostfix="BeakerStack">
    Your browser does not support custom elements. Use a current evergreen browser.
  </mutation-test-report-app>
  <script>
    const app = document.querySelector('mutation-test-report-app');
    app.report = ${escapeHtmlTags(JSON.stringify(report))};
    function updateTheme() {
      document.body.style.backgroundColor = app.themeBackgroundColor;
    }
    app.addEventListener('theme-changed', updateTheme);
    updateTheme();
  </script>
</body>
</html>
`;
}

/**
 * @param {string} repoRoot
 * @param {string[]} [packages]
 */
function loadPackageReports(repoRoot, packages = MUTATION_PACKAGES) {
  /** @type {Record<string, import('mutation-testing-report-schema').MutationTestResult>} */
  const loaded = {};
  /** @type {string[]} */
  const missing = [];

  for (const name of packages) {
    const reportFile = path.join(
      repoRoot,
      mutationReportDir(name),
      'reports',
      'mutation',
      'mutation.json'
    );
    if (!fs.existsSync(reportFile)) {
      missing.push(name);
      continue;
    }
    loaded[name] = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  }

  return { loaded, missing };
}

/**
 * @param {{ repoRoot: string, packages?: string[], outputDir?: string }} options
 */
function writeMergedMutationReports(options) {
  const packages = options.packages || MUTATION_PACKAGES;
  const { loaded, missing } = loadPackageReports(options.repoRoot, packages);
  const names = Object.keys(loaded);

  if (names.length === 0) {
    return { written: false, missing, summary: null, outputDir: null };
  }

  const { merged, summary } = buildMutationSummary(loaded, missing);
  const outputDir =
    options.outputDir || path.join(options.repoRoot, 'reports', 'mutation');
  fs.mkdirSync(outputDir, { recursive: true });

  const summaryFile = path.join(outputDir, 'mutation-summary.json');
  const mergedFile = path.join(outputDir, 'mutation.json');
  const htmlFile = path.join(outputDir, 'mutation.html');

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  fs.writeFileSync(mergedFile, JSON.stringify(merged));
  fs.writeFileSync(htmlFile, renderMutationHtml(merged));

  return {
    written: true,
    missing,
    summary,
    outputDir,
    summaryFile,
    mergedFile,
    htmlFile,
  };
}

module.exports = {
  MUTATION_TARGETS,
  MUTATION_PACKAGES,
  mutationReportDir,
  summarizeReport,
  buildMergedMutationReport,
  buildMutationSummary,
  escapeHtmlTags,
  renderMutationHtml,
  loadPackageReports,
  writeMergedMutationReports,
};
