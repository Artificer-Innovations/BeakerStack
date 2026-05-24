/** @typedef {'admin' | 'auth' | 'billing' | 'marketing' | 'navigation' | 'profile' | 'waitlist' | 'other'} E2ECategory */

export const E2E_CATEGORIES = [
  'admin',
  'auth',
  'billing',
  'marketing',
  'navigation',
  'profile',
  'waitlist',
];

/**
 * Derive E2E report category from a Playwright spec file path.
 * Playwright JSON reports use paths like `auth/login.spec.ts` (relative to specs/).
 * @param {string | undefined | null} file
 * @returns {E2ECategory}
 */
export function categoryFromSpecFile(file) {
  const normalized = String(file ?? '').replace(/\\/g, '/');
  const specsMatch = normalized.match(/(?:^|\/)specs\/([^/]+)\//);
  if (specsMatch?.[1] && E2E_CATEGORIES.includes(specsMatch[1])) {
    return /** @type {E2ECategory} */ (specsMatch[1]);
  }
  const relativeMatch = normalized.match(/^([^/]+)\//);
  const segment = relativeMatch?.[1];
  return E2E_CATEGORIES.includes(segment)
    ? /** @type {E2ECategory} */ (segment)
    : 'other';
}

/**
 * @param {Array<{ category?: E2ECategory, status: string }>} cases
 */
export function summarizeByCategory(cases) {
  /** @type {Map<E2ECategory, { passed: number, passedAfterRetry: number, skipped: number, failed: number }>} */
  const byCategory = new Map();

  for (const testCase of cases) {
    const category = testCase.category ?? 'other';
    if (!byCategory.has(category)) {
      byCategory.set(category, {
        passed: 0,
        passedAfterRetry: 0,
        skipped: 0,
        failed: 0,
      });
    }
    const bucket = byCategory.get(category);
    if (testCase.status === 'passed') {
      bucket.passed += 1;
    } else if (testCase.status === 'passedAfterRetry') {
      bucket.passedAfterRetry += 1;
    } else if (testCase.status === 'skipped') {
      bucket.skipped += 1;
    } else {
      bucket.failed += 1;
    }
  }

  return byCategory;
}

/**
 * @param {{ passed: number, passedAfterRetry: number, skipped: number, failed: number }} counts
 */
export function formatCategorySummaryLabel(counts) {
  const parts = [];
  const passedTotal = counts.passed + counts.passedAfterRetry;
  if (passedTotal > 0) {
    parts.push(`${passedTotal} passed`);
  }
  if (counts.failed > 0) {
    parts.push(`${counts.failed} failed`);
  }
  if (counts.skipped > 0) {
    parts.push(`${counts.skipped} skipped`);
  }
  return parts.length > 0 ? parts.join(', ') : '0 tests';
}
