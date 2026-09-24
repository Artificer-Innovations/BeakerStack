import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildMutationSummary,
  escapeHtmlTags,
  renderMutationHtml,
  writeMergedMutationReports,
} = require('../lib/merge-mutation-reports.js');

function mutant(id, status) {
  return {
    id,
    mutatorName: 'StringLiteral',
    replacement: 'x',
    location: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 2 },
    },
    status,
  };
}

function report(killed, survived) {
  const mutants = [];
  for (let i = 0; i < killed; i += 1) {
    mutants.push(mutant(`k${i}`, 'Killed'));
  }
  for (let i = 0; i < survived; i += 1) {
    mutants.push(mutant(`s${i}`, 'Survived'));
  }
  return {
    schemaVersion: '1.7',
    thresholds: { high: 80, low: 60 },
    files: {
      'src/example.ts': {
        language: 'typescript',
        source: 'export const value = 1;\n',
        mutants,
      },
    },
  };
}

test('buildMutationSummary weights the score by mutant count', () => {
  const { summary, merged } = buildMutationSummary(
    {
      logger: report(9, 1),
      billing: report(1, 1),
    },
    ['email']
  );

  assert.equal(summary.byPackage.logger.mutationScore, 90);
  assert.equal(summary.byPackage.billing.mutationScore, 50);
  assert.equal(summary.total.totalValid, 12);
  assert.equal(summary.total.totalDetected, 10);
  assert.equal(summary.total.mutationScore, (10 / 12) * 100);
  assert.deepEqual(summary.missing, ['email']);
  assert.ok(merged.files['logger/example.ts']);
  assert.ok(merged.files['billing/example.ts']);
  assert.deepEqual(merged.thresholds, { high: 80, low: 60 });
});

test('renderMutationHtml embeds the report without raw HTML tags in JSON', () => {
  const html = renderMutationHtml(report(1, 0));
  assert.match(html, /<mutation-test-report-app/);
  assert.match(html, /app\.report =/);
  assert.equal(escapeHtmlTags('{"a":"<script>"}'), '{"a":"<"+"script>"}');
  assert.doesNotMatch(html, /<script>"}/);
});

test('writeMergedMutationReports reads package JSON and writes a combined report', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-merge-'));
  const pkgDir = path.join(
    repoRoot,
    'packages',
    'logger',
    'reports',
    'mutation'
  );
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'mutation.json'),
    JSON.stringify(report(2, 2))
  );

  const result = writeMergedMutationReports({
    repoRoot,
    packages: ['logger', 'email'],
  });

  assert.equal(result.written, true);
  assert.deepEqual(result.missing, ['email']);
  assert.equal(result.summary.total.mutationScore, 50);
  assert.equal(fs.existsSync(result.htmlFile), true);
  assert.equal(fs.existsSync(result.summaryFile), true);
  const summary = JSON.parse(fs.readFileSync(result.summaryFile, 'utf8'));
  assert.equal(summary.byPackage.logger.survived, 2);
});

test('writeMergedMutationReports reads app reports from apps/', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-app-'));
  const webDir = path.join(repoRoot, 'apps', 'web', 'reports', 'mutation');
  fs.mkdirSync(webDir, { recursive: true });
  fs.writeFileSync(
    path.join(webDir, 'mutation.json'),
    JSON.stringify(report(3, 1))
  );

  const result = writeMergedMutationReports({
    repoRoot,
    packages: ['web', 'mobile'],
  });

  assert.equal(result.written, true);
  assert.deepEqual(result.missing, ['mobile']);
  assert.equal(result.summary.byPackage.web.killed, 3);
  assert.ok(result.summary.total.mutationScore > 70);
});

test('writeMergedMutationReports fails closed when nothing was produced', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-empty-'));
  const result = writeMergedMutationReports({
    repoRoot,
    packages: ['logger'],
  });
  assert.equal(result.written, false);
  assert.deepEqual(result.missing, ['logger']);
});
