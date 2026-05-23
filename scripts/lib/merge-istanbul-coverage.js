'use strict';

/**
 * Merge Istanbul coverage-final.json objects from multiple test runs.
 * Hit counts are combined with max() so a statement/branch/function is
 * considered covered if any run executed it.
 */

/**
 * @param {Record<string, number> | undefined} left
 * @param {Record<string, number> | undefined} right
 */
function mergeHitMap(left, right) {
  const merged = { ...(left || {}) };

  for (const [key, hits] of Object.entries(right || {})) {
    merged[key] = Math.max(merged[key] || 0, hits);
  }

  return merged;
}

/**
 * @param {Record<string, number | number[]> | undefined} left
 * @param {Record<string, number | number[]> | undefined} right
 */
function mergeBranchMap(left, right) {
  const merged = { ...(left || {}) };

  for (const [key, hits] of Object.entries(right || {})) {
    if (Array.isArray(hits)) {
      const existing = merged[key];
      if (!Array.isArray(existing)) {
        merged[key] = [...hits];
        continue;
      }

      merged[key] = hits.map((hit, index) =>
        Math.max(existing[index] || 0, hit)
      );
      continue;
    }

    merged[key] = Math.max(Number(merged[key]) || 0, hits);
  }

  return merged;
}

/**
 * @param {Record<string, unknown> | undefined} left
 * @param {Record<string, unknown> | undefined} right
 */
function mergeFileCoverage(left, right) {
  if (!left) {
    return right ? { ...right } : undefined;
  }
  if (!right) {
    return { ...left };
  }

  return {
    ...left,
    ...right,
    s: mergeHitMap(
      /** @type {Record<string, number>} */ (left.s),
      /** @type {Record<string, number>} */ (right.s)
    ),
    f: mergeHitMap(
      /** @type {Record<string, number>} */ (left.f),
      /** @type {Record<string, number>} */ (right.f)
    ),
    b: mergeBranchMap(
      /** @type {Record<string, number | number[]>} */ (left.b),
      /** @type {Record<string, number | number[]>} */ (right.b)
    ),
    l: mergeHitMap(
      /** @type {Record<string, number>} */ (left.l),
      /** @type {Record<string, number>} */ (right.l)
    ),
    statementMap:
      left.statementMap || right.statementMap
        ? {
            .../** @type {Record<string, unknown>} */ (left.statementMap),
            .../** @type {Record<string, unknown>} */ (right.statementMap),
          }
        : undefined,
    fnMap:
      left.fnMap || right.fnMap
        ? {
            .../** @type {Record<string, unknown>} */ (left.fnMap),
            .../** @type {Record<string, unknown>} */ (right.fnMap),
          }
        : undefined,
    branchMap:
      left.branchMap || right.branchMap
        ? {
            .../** @type {Record<string, unknown>} */ (left.branchMap),
            .../** @type {Record<string, unknown>} */ (right.branchMap),
          }
        : undefined,
  };
}

/**
 * @param {Record<string, Record<string, unknown>>[]} reports
 */
function mergeIstanbulCoverageReports(reports) {
  /** @type {Record<string, Record<string, unknown>>} */
  const merged = {};

  for (const report of reports) {
    for (const [filePath, fileCoverage] of Object.entries(report || {})) {
      merged[filePath] = /** @type {Record<string, unknown>} */ (
        mergeFileCoverage(merged[filePath], fileCoverage)
      );
    }
  }

  return merged;
}

module.exports = {
  mergeHitMap,
  mergeBranchMap,
  mergeFileCoverage,
  mergeIstanbulCoverageReports,
};
