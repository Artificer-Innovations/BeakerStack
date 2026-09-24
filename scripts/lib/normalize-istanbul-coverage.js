'use strict';

/**
 * Normalize Istanbul coverage-final.json entries so tools that assume full
 * maps (e.g. crap-score) do not crash on empty/"all" coverage stubs that omit
 * fnMap / branchMap / statementMap.
 *
 * @param {Record<string, Record<string, unknown>>} coverage
 * @returns {Record<string, Record<string, unknown>>}
 */
function normalizeIstanbulCoverage(coverage) {
  /** @type {Record<string, Record<string, unknown>>} */
  const normalized = {};

  for (const [filePath, fileCoverage] of Object.entries(coverage || {})) {
    if (!fileCoverage || typeof fileCoverage !== 'object') {
      continue;
    }

    const path =
      typeof fileCoverage.path === 'string' && fileCoverage.path.length > 0
        ? fileCoverage.path
        : filePath;

    normalized[filePath] = {
      ...fileCoverage,
      path,
      statementMap:
        fileCoverage.statementMap &&
        typeof fileCoverage.statementMap === 'object'
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
    };
  }

  return normalized;
}

module.exports = {
  normalizeIstanbulCoverage,
};
