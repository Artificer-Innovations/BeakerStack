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
function mergeSourceMap(left, right) {
  return {
    ...(left ?? {}),
    ...(right ?? {}),
  };
}

/**
 * Ensure Istanbul map fields exist so consumers (e.g. CRAP analysis) can
 * safely Object.keys() them even for empty/"all" coverage stubs.
 *
 * @param {Record<string, unknown>} fileCoverage
 * @returns {Record<string, unknown>}
 */
function ensureCoverageMaps(fileCoverage) {
  return {
    ...fileCoverage,
    s:
      fileCoverage.s && typeof fileCoverage.s === 'object'
        ? fileCoverage.s
        : {},
    f:
      fileCoverage.f && typeof fileCoverage.f === 'object'
        ? fileCoverage.f
        : {},
    b:
      fileCoverage.b && typeof fileCoverage.b === 'object'
        ? fileCoverage.b
        : {},
    statementMap:
      fileCoverage.statementMap && typeof fileCoverage.statementMap === 'object'
        ? fileCoverage.statementMap
        : {},
    fnMap:
      fileCoverage.fnMap && typeof fileCoverage.fnMap === 'object'
        ? fileCoverage.fnMap
        : {},
    branchMap:
      fileCoverage.branchMap && typeof fileCoverage.branchMap === 'object'
        ? fileCoverage.branchMap
        : {},
  };
}

/**
 * @param {Record<string, unknown> | undefined} left
 * @param {Record<string, unknown> | undefined} right
 */
function mergeFileCoverage(left, right) {
  if (!left) {
    return right ? ensureCoverageMaps({ ...right }) : undefined;
  }
  if (!right) {
    return ensureCoverageMaps({ ...left });
  }

  return ensureCoverageMaps({
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
    statementMap: mergeSourceMap(
      /** @type {Record<string, unknown>} */ (left.statementMap),
      /** @type {Record<string, unknown>} */ (right.statementMap)
    ),
    fnMap: mergeSourceMap(
      /** @type {Record<string, unknown>} */ (left.fnMap),
      /** @type {Record<string, unknown>} */ (right.fnMap)
    ),
    branchMap: mergeSourceMap(
      /** @type {Record<string, unknown>} */ (left.branchMap),
      /** @type {Record<string, unknown>} */ (right.branchMap)
    ),
  });
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
  mergeSourceMap,
  ensureCoverageMaps,
  mergeFileCoverage,
  mergeIstanbulCoverageReports,
};
