import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MONOREPO_ROOT = resolve(__dirname, '../../../..');

function walk(dir: string, ext: string, skip: string[] = []): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (skip.includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...walk(full, ext, skip));
      } else if (entry.endsWith(ext)) {
        results.push(full);
      }
    }
  } catch {
    // directory doesn't exist — skip
  }
  return results;
}

const SCAN_FILES = [
  ...walk(join(MONOREPO_ROOT, 'packages/shared/src/components'), '.web.tsx', ['__tests__']),
  ...walk(join(MONOREPO_ROOT, 'packages/billing/src/components'), '.web.tsx', ['__tests__']),
  ...walk(join(MONOREPO_ROOT, 'apps/web/src/components/billing'), '.tsx', ['__tests__']),
  ...walk(join(MONOREPO_ROOT, 'apps/web/src/pages/billing'), '.tsx', ['__tests__']),
];

// Extract string literals that look like they contain Tailwind class names.
// Scans ALL quoted strings in the file (not just className=) to catch dynamic
// class strings built via template literals and variable assignments.
function extractClassLikeStrings(src: string): string[] {
  const results = new Set<string>();
  const re = /['"]([^'"]{4,})['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = m[1];
    if (/\b(?:text|bg|border|rounded|flex|grid|font|shadow|hover|dark)[-:][a-zA-Z0-9/[\].]+/.test(s)) {
      results.add(s);
    }
  }
  return [...results];
}

// Light text shades that are hard to read on dark backgrounds
const NEEDS_DARK_TEXT = /\btext-(?:gray|slate|zinc|neutral|stone)-(?:600|700|800|900|950)\b/;
// Light backgrounds that are painful in dark mode
const NEEDS_DARK_BG = /\bbg-(?:white|(?:gray|slate|zinc)-(?:50|100|200|300))\b/;

describe('dark mode coverage', () => {
  it('scans at least one file', () => {
    expect(SCAN_FILES.length).toBeGreaterThan(0);
  });

  it('class strings with light text colors have a dark:text- counterpart', () => {
    const violations: string[] = [];
    for (const file of SCAN_FILES) {
      const src = readFileSync(file, 'utf8');
      for (const cls of extractClassLikeStrings(src)) {
        if (NEEDS_DARK_TEXT.test(cls) && !/\bdark:text-/.test(cls)) {
          violations.push(`${file.replace(MONOREPO_ROOT + '/', '')}: "${cls.slice(0, 80)}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('class strings with light backgrounds have a dark:bg- counterpart', () => {
    const violations: string[] = [];
    for (const file of SCAN_FILES) {
      const src = readFileSync(file, 'utf8');
      for (const cls of extractClassLikeStrings(src)) {
        if (NEEDS_DARK_BG.test(cls) && !/\bdark:bg-/.test(cls)) {
          violations.push(`${file.replace(MONOREPO_ROOT + '/', '')}: "${cls.slice(0, 80)}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
