'use strict';

/**
 * Build a slim CRAP summary for CI / PR comments from a CRAP report.
 *
 * CRAP = complexity² × (1 − coverage)³ + complexity
 */

const DEFAULT_THRESHOLD = 30;
const DEFAULT_TOP_N = 10;

/**
 * @typedef {object} CrapFunctionEntry
 * @property {string} file
 * @property {string} name
 * @property {string} functionDescriptor
 * @property {number} line
 * @property {number} complexity
 * @property {number} coverage
 * @property {number} crap
 */

/**
 * Flatten a CRAP report into function entries sorted by CRAP descending.
 *
 * @param {Record<string, Record<string, {
 *   functionDescriptor?: string,
 *   start?: { line?: number },
 *   complexity?: number,
 *   statements?: { coverage?: number, crap?: number },
 * }>>} report
 * @param {{ repoRoot?: string }} [options]
 * @returns {CrapFunctionEntry[]}
 */
function flattenCrapReport(report, options = {}) {
  const repoRoot = options.repoRoot ? options.repoRoot.replace(/\/+$/, '') : '';
  /** @type {CrapFunctionEntry[]} */
  const entries = [];

  for (const [filePath, functions] of Object.entries(report || {})) {
    let file = filePath;
    if (repoRoot && file.startsWith(repoRoot + '/')) {
      file = file.slice(repoRoot.length + 1);
    } else if (repoRoot && file.startsWith(repoRoot)) {
      file = file.slice(repoRoot.length).replace(/^\//, '');
    }

    for (const [name, fn] of Object.entries(functions || {})) {
      const crap = fn?.statements?.crap;
      if (typeof crap !== 'number' || Number.isNaN(crap)) {
        continue;
      }

      entries.push({
        file,
        name,
        functionDescriptor: fn.functionDescriptor || name,
        line: fn.start?.line ?? 0,
        complexity: fn.complexity ?? 1,
        coverage: fn.statements?.coverage ?? 0,
        crap,
      });
    }
  }

  entries.sort((a, b) => b.crap - a.crap || a.file.localeCompare(b.file));
  return entries;
}

/**
 * @param {CrapFunctionEntry[]} entries
 * @param {{ threshold?: number, topN?: number }} [options]
 */
function buildCrapSummary(entries, options = {}) {
  const threshold =
    typeof options.threshold === 'number'
      ? options.threshold
      : DEFAULT_THRESHOLD;
  const topN = typeof options.topN === 'number' ? options.topN : DEFAULT_TOP_N;

  const aboveThreshold = entries.filter(entry => entry.crap >= threshold);

  return {
    threshold,
    totalFunctions: entries.length,
    aboveThreshold: aboveThreshold.length,
    top: aboveThreshold.slice(0, topN).map(entry => ({
      file: entry.file,
      name: entry.name,
      functionDescriptor: entry.functionDescriptor,
      line: entry.line,
      complexity: entry.complexity,
      coverage: entry.coverage,
      crap: entry.crap,
    })),
  };
}

/**
 * Format a markdown section for the CI coverage PR comment.
 *
 * @param {{
 *   threshold?: number,
 *   totalFunctions?: number,
 *   aboveThreshold?: number,
 *   top?: CrapFunctionEntry[],
 * } | null | undefined} summary
 * @returns {string[]}
 */
function formatCrapCommentSection(summary) {
  if (!summary || summary.unavailable) {
    return ['#### CRAP analysis', '', '_CRAP summary not available._', ''];
  }

  const threshold = summary.threshold ?? DEFAULT_THRESHOLD;
  const above = summary.aboveThreshold ?? 0;
  const top = Array.isArray(summary.top) ? summary.top : [];

  const lines = [
    '#### CRAP analysis',
    '',
    `Functions with CRAP ≥ ${threshold}: **${above}** of ${summary.totalFunctions ?? 0}`,
    '',
  ];

  if (above === 0) {
    lines.push(`No functions above CRAP threshold ${threshold}.`, '');
    return lines;
  }

  lines.push(`| CRAP | Complexity | Coverage | Function |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const entry of top) {
    const location =
      entry.line > 0 ? `${entry.file}:${entry.line}` : entry.file;
    const label = entry.functionDescriptor || entry.name;
    const coveragePct = ((entry.coverage ?? 0) * 100).toFixed(0);
    lines.push(
      `| ${entry.crap.toFixed(1)} | ${entry.complexity} | ${coveragePct}% | \`${label}\` (${location}) |`
    );
  }
  lines.push('');
  return lines;
}

/** Sentinel written when CRAP analysis is skipped or fails. */
function unavailableCrapSummary() {
  return { unavailable: true };
}

module.exports = {
  DEFAULT_THRESHOLD,
  DEFAULT_TOP_N,
  flattenCrapReport,
  buildCrapSummary,
  formatCrapCommentSection,
  unavailableCrapSummary,
};
