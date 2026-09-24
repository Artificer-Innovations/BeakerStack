'use strict';

/**
 * Lightweight CRAP analysis from Istanbul coverage + TypeScript AST complexity.
 * No NestJS / crap-score dependency.
 *
 * CRAP = complexity² × (1 − coverage)³ + complexity
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

/**
 * @param {{ complexity: number, coverage: number }} input
 * @returns {number}
 */
function crapScore({ complexity, coverage }) {
  const cc = Math.max(1, Number(complexity) || 1);
  const cov = Math.min(1, Math.max(0, Number(coverage) || 0));
  return cc ** 2 * (1 - cov) ** 3 + cc;
}

/**
 * @param {{ line?: number, column?: number } | undefined} location
 * @param {{ start: { line?: number, column?: number }, end: { line?: number, column?: number } } | undefined} range
 */
function locationIsInRange(location, range) {
  if (!location || !range?.start || !range?.end) {
    return false;
  }
  const line = location.line;
  if (typeof line !== 'number') {
    return false;
  }
  if (line < range.start.line || line > range.end.line) {
    return false;
  }
  if (location.column == null) {
    return true;
  }
  if (
    range.start.column != null &&
    range.end.column != null &&
    line === range.start.line &&
    line === range.end.line
  ) {
    return (
      location.column >= range.start.column &&
      location.column <= range.end.column
    );
  }
  if (range.start.column != null && line === range.start.line) {
    return location.column >= range.start.column;
  }
  if (range.end.column != null && line === range.end.line) {
    return location.column <= range.end.column;
  }
  return true;
}

/**
 * Statement coverage for an Istanbul function entry.
 *
 * @param {string} functionId
 * @param {Record<string, unknown>} fileCoverage
 */
function getCoverageForFunction(functionId, fileCoverage) {
  const fnMap = /** @type {Record<string, { decl?: object, loc?: object }>} */ (
    fileCoverage.fnMap || {}
  );
  const coverageFn = fnMap[functionId];
  if (!coverageFn) {
    return { covered: 0, total: 0 };
  }

  const statementMap =
    /** @type {Record<string, { start?: object, end?: object }>} */ (
      fileCoverage.statementMap || {}
    );
  const hits = /** @type {Record<string, number>} */ (fileCoverage.s || {});

  const statementIds = Object.entries(statementMap)
    .filter(([, { start, end }]) => {
      return (
        locationIsInRange(start, coverageFn.decl) ||
        locationIsInRange(end, coverageFn.decl) ||
        locationIsInRange(start, coverageFn.loc) ||
        locationIsInRange(end, coverageFn.loc)
      );
    })
    .map(([id]) => id);

  const covered = statementIds.filter(id => (hits[id] || 0) > 0).length;
  return { covered, total: statementIds.length };
}

/**
 * Cyclomatic complexity for a TS/JS AST node (function-like).
 * Nested function-like nodes are not counted toward the outer function
 * (matches ESLint `complexity` behavior).
 *
 * @param {import('typescript').Node} node
 * @returns {number}
 */
function cyclomaticComplexity(node) {
  let complexity = 1;

  /** @param {import('typescript').Node} n */
  function visit(n) {
    // Skip nested functions — they get their own CRAP entry via Istanbul fnMap.
    if (n !== node && isFunctionLike(n)) {
      return;
    }

    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
        complexity += 1;
        break;
      case ts.SyntaxKind.CaseClause:
        complexity += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const bin = /** @type {import('typescript').BinaryExpression} */ (n);
        if (
          bin.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          bin.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          bin.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          complexity += 1;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return complexity;
}

/**
 * @param {import('typescript').Node} node
 * @param {import('typescript').SourceFile} sourceFile
 */
function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/**
 * @param {import('typescript').Node} node
 * @param {import('typescript').SourceFile} sourceFile
 * @returns {string}
 */
function describeFunction(node, sourceFile) {
  if (ts.isConstructorDeclaration(node)) {
    return 'constructor';
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    const name = node.name?.getText(sourceFile) || 'anonymous';
    return ts.isGetAccessorDeclaration(node)
      ? `getter '${name}'`
      : `setter '${name}'`;
  }
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isFunctionExpression(node)
  ) {
    const name = node.name?.getText(sourceFile);
    if (name) {
      return ts.isMethodDeclaration(node)
        ? `method '${name}'`
        : `function '${name}'`;
    }
  }
  if (ts.isArrowFunction(node)) {
    return 'arrow function';
  }
  return 'anonymous function';
}

/**
 * Collect function-like nodes with line ranges and complexity.
 *
 * @param {string} sourcePath
 * @param {string} sourceText
 */
function collectAstFunctions(sourcePath, sourceText) {
  const kind = sourcePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : sourcePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : sourcePath.endsWith('.js') ||
          sourcePath.endsWith('.mjs') ||
          sourcePath.endsWith('.cjs')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    kind
  );

  /** @type {{ startLine: number, endLine: number, startColumn: number, endColumn: number, complexity: number, descriptor: string }[]} */
  const functions = [];

  /** @param {import('typescript').Node} node */
  function visit(node) {
    if (isFunctionLike(node)) {
      const start = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      functions.push({
        startLine: start.line + 1,
        endLine: end.line + 1,
        startColumn: start.character,
        endColumn: end.character,
        complexity: cyclomaticComplexity(node),
        descriptor: describeFunction(node, sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return functions;
}

/**
 * Match an Istanbul fnMap entry to the best overlapping AST function.
 *
 * @param {{ loc?: { start?: { line?: number }, end?: { line?: number } }, line?: number, name?: string }} coverageFn
 * @param {{ startLine: number, endLine: number, complexity: number, descriptor: string }[]} astFunctions
 */
function matchAstFunction(coverageFn, astFunctions) {
  const startLine = coverageFn.loc?.start?.line ?? coverageFn.line ?? 0;
  const endLine = coverageFn.loc?.end?.line ?? startLine;

  let best = null;
  let bestScore = -1;

  for (const candidate of astFunctions) {
    const overlapStart = Math.max(startLine, candidate.startLine);
    const overlapEnd = Math.min(endLine, candidate.endLine);
    const overlap = overlapEnd - overlapStart + 1;
    if (overlap <= 0) {
      continue;
    }
    // Prefer tighter matches (smaller AST range that still covers the istanbul loc).
    const span = candidate.endLine - candidate.startLine + 1;
    const score = overlap * 1000 - span;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * @param {Record<string, unknown>} fileCoverage
 * @returns {number[]}
 */
function getUncoveredLines(fileCoverage) {
  const statementMap =
    /** @type {Record<string, { start?: { line?: number }, end?: { line?: number } }>} */ (
      fileCoverage.statementMap || {}
    );
  const hits = /** @type {Record<string, number>} */ (fileCoverage.s || {});
  /** @type {Set<number>} */
  const lines = new Set();

  for (const [id, statement] of Object.entries(statementMap)) {
    if ((hits[id] || 0) !== 0) {
      continue;
    }
    const startLine = statement.start?.line;
    const endLine = statement.end?.line ?? startLine;
    if (typeof startLine !== 'number') {
      continue;
    }
    for (let line = startLine; line <= (endLine || startLine); line++) {
      lines.add(line);
    }
  }

  return Array.from(lines).sort((a, b) => a - b);
}

/**
 * Analyze one Istanbul file entry.
 *
 * @param {string} absolutePath
 * @param {Record<string, unknown>} fileCoverage
 */
function analyzeFile(absolutePath, fileCoverage) {
  /** @type {Record<string, object>} */
  const result = {};
  const fnMap =
    /** @type {Record<string, { name?: string, loc?: object, line?: number }>} */ (
      fileCoverage.fnMap || {}
    );
  if (Object.keys(fnMap).length === 0) {
    return result;
  }

  let astFunctions = [];
  if (fs.existsSync(absolutePath)) {
    try {
      const sourceText = fs.readFileSync(absolutePath, 'utf8');
      astFunctions = collectAstFunctions(absolutePath, sourceText);
    } catch {
      astFunctions = [];
    }
  }

  const uncoveredLines = getUncoveredLines(fileCoverage);

  for (const [functionId, coverageFn] of Object.entries(fnMap)) {
    const coverageData = getCoverageForFunction(functionId, fileCoverage);
    const coverage =
      coverageData.total === 0 ? 1 : coverageData.covered / coverageData.total;

    const matched = matchAstFunction(coverageFn, astFunctions);
    const complexity = matched?.complexity ?? 1;
    const descriptor =
      matched?.descriptor ||
      (coverageFn.name && coverageFn.name !== '(anonymous)'
        ? `function '${coverageFn.name}'`
        : 'anonymous function');

    const startLine =
      matched?.startLine ?? coverageFn.loc?.start?.line ?? coverageFn.line ?? 0;
    const endLine = matched?.endLine ?? coverageFn.loc?.end?.line ?? startLine;

    const score = crapScore({ complexity, coverage });
    const key = coverageFn.name || `fn_${functionId}`;

    // Avoid clobbering duplicate istanbul names by suffixing when needed.
    let reportKey = key;
    let suffix = 2;
    while (result[reportKey]) {
      reportKey = `${key}#${suffix}`;
      suffix += 1;
    }

    result[reportKey] = {
      functionDescriptor: descriptor,
      start: { line: startLine, column: matched?.startColumn ?? 0 },
      end: { line: endLine, column: matched?.endColumn ?? 0 },
      complexity,
      statements: {
        covered: coverageData.covered,
        total: coverageData.total,
        coverage,
        crap: score,
      },
      uncoveredLines: uncoveredLines.filter(
        line => line >= startLine && line <= endLine
      ),
    };
  }

  return result;
}

/**
 * Build a full CRAP report from normalized Istanbul coverage.
 *
 * @param {Record<string, Record<string, unknown>>} coverage
 * @param {{ repoRoot?: string }} [options]
 */
function buildCrapReport(coverage, options = {}) {
  const repoRoot = options.repoRoot
    ? path.resolve(options.repoRoot).replace(/\/+$/, '')
    : '';

  /** @type {Record<string, Record<string, object>>} */
  const report = {};

  for (const [fileKey, fileCoverage] of Object.entries(coverage || {})) {
    const absolutePath =
      typeof fileCoverage.path === 'string' && fileCoverage.path.length > 0
        ? fileCoverage.path
        : fileKey;

    let relativePath = absolutePath;
    if (repoRoot && absolutePath.startsWith(repoRoot + path.sep)) {
      relativePath = absolutePath.slice(repoRoot.length + 1);
    } else if (repoRoot && absolutePath.startsWith(repoRoot)) {
      relativePath = absolutePath.slice(repoRoot.length).replace(/^\//, '');
    }

    const fileReport = analyzeFile(absolutePath, fileCoverage);
    if (Object.keys(fileReport).length > 0) {
      report[relativePath] = fileReport;
    }
  }

  return report;
}

/**
 * Write a simple HTML table report sorted by CRAP (highest first).
 *
 * @param {Record<string, Record<string, object>>} report
 * @param {string} outputDir
 * @param {{ threshold?: number }} [options]
 */
function writeHtmlReport(report, outputDir, options = {}) {
  const threshold =
    typeof options.threshold === 'number' ? options.threshold : 30;

  /** @type {{ file: string, descriptor: string, line: number, complexity: number, coverage: number, crap: number }[]} */
  const rows = [];
  for (const [file, functions] of Object.entries(report)) {
    for (const fn of Object.values(functions)) {
      rows.push({
        file,
        descriptor: fn.functionDescriptor || '',
        line: fn.start?.line || 0,
        complexity: fn.complexity || 1,
        coverage: fn.statements?.coverage ?? 0,
        crap: fn.statements?.crap ?? 0,
      });
    }
  }
  rows.sort((a, b) => b.crap - a.crap);

  const escape = text =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const body = rows
    .map(row => {
      const highlight = row.crap >= threshold ? ' class="high"' : '';
      return `<tr${highlight}><td>${row.crap.toFixed(1)}</td><td>${row.complexity}</td><td>${(row.coverage * 100).toFixed(0)}%</td><td><code>${escape(row.descriptor)}</code></td><td><code>${escape(row.file)}${row.line ? ':' + row.line : ''}</code></td></tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>CRAP report</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:2rem;color:#111}
h1{font-size:1.25rem}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid #ddd;padding:.4rem .5rem;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#f7f7f7}
tr.high{background:#fff4e5}
code{font-size:12px}
.meta{color:#555;margin-bottom:1rem}
</style>
</head>
<body>
<h1>CRAP report</h1>
<p class="meta">${rows.length} functions · highlight = CRAP ≥ ${threshold} · formula = complexity² × (1 − coverage)³ + complexity</p>
<table>
<thead><tr><th>CRAP</th><th>Complexity</th><th>Coverage</th><th>Function</th><th>Location</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>
`;

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

module.exports = {
  crapScore,
  locationIsInRange,
  getCoverageForFunction,
  cyclomaticComplexity,
  collectAstFunctions,
  matchAstFunction,
  buildCrapReport,
  writeHtmlReport,
};
