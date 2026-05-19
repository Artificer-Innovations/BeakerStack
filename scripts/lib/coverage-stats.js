'use strict';

/**
 * Count covered vs total for a hit-count map (statements, functions, lines).
 * @param {Record<string, number> | undefined} hits
 */
function countHits(hits) {
  const values = Object.values(hits || {});
  return {
    total: values.length,
    covered: values.filter(v => v > 0).length,
  };
}

/**
 * Compute line coverage for an Istanbul coverage file entry.
 * Vitest v8 omits `l`; derive from statementMap. Jest provides `l` directly.
 * A line is covered when any statement on that line was executed.
 *
 * @param {{ s?: Record<string, number>, l?: Record<string, number>, statementMap?: Record<string, { start: { line: number } }> }} file
 */
function lineCoverageFromFile(file) {
  if (!file || typeof file !== 'object') {
    return { total: 0, covered: 0 };
  }

  if (file.l && Object.keys(file.l).length > 0) {
    return countHits(file.l);
  }

  if (!file.s || !file.statementMap) {
    return { total: 0, covered: 0 };
  }

  /** @type {Map<number, boolean>} */
  const lineHits = new Map();
  for (const [stmtId, loc] of Object.entries(file.statementMap)) {
    const line = loc.start.line;
    if (!lineHits.has(line)) {
      lineHits.set(line, false);
    }
    if (file.s[stmtId] > 0) {
      lineHits.set(line, true);
    }
  }

  const hits = [...lineHits.values()];
  return {
    total: hits.length,
    covered: hits.filter(Boolean).length,
  };
}

/**
 * Count branch coverage for an Istanbul coverage file entry.
 * Each branch location maps to an array of hit counts (one per path).
 *
 * @param {{ b?: Record<string, number | number[]> }} file
 */
function branchCoverageFromFile(file) {
  const branchValues = Object.values(file?.b || {});
  let total = 0;
  let covered = 0;

  for (const hits of branchValues) {
    if (Array.isArray(hits)) {
      total += hits.length;
      covered += hits.filter(h => h > 0).length;
    } else {
      total += 1;
      if (hits > 0) {
        covered += 1;
      }
    }
  }

  return { total, covered };
}

/**
 * @param {{ s?: Record<string, number>, b?: Record<string, number[]>, f?: Record<string, number>, l?: Record<string, number>, statementMap?: Record<string, { start: { line: number } }> }} file
 */
function fileCoverageStats(file) {
  if (!file || typeof file !== 'object' || !file.s) {
    return null;
  }

  const statements = countHits(file.s);
  const functions = countHits(file.f);
  const lines = lineCoverageFromFile(file);
  const branches = branchCoverageFromFile(file);

  return { statements, branches, functions, lines };
}

/**
 * @param {Record<string, unknown>} coverageData
 */
function aggregateCoverageStats(coverageData) {
  const stats = {
    statements: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 },
  };

  for (const file of Object.values(coverageData)) {
    const fileStats = fileCoverageStats(file);
    if (!fileStats) {
      continue;
    }

    for (const key of Object.keys(stats)) {
      stats[key].total += fileStats[key].total;
      stats[key].covered += fileStats[key].covered;
    }
  }

  return stats;
}

/** @param {{ total: number, covered: number }} metric */
function pct(metric) {
  return metric.total > 0 ? (metric.covered / metric.total) * 100 : 0;
}

module.exports = {
  countHits,
  lineCoverageFromFile,
  branchCoverageFromFile,
  fileCoverageStats,
  aggregateCoverageStats,
  pct,
};
