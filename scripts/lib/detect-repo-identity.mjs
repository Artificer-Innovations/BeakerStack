import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_DISPLAY = 'Beaker Stack';
const DEFAULT_LEGAL = 'Artificer Innovations, LLC';

const BRANDING_RELATIVE_PATHS = [
  ['adopter', 'config', 'branding.ts'],
  ['packages', 'shared', 'src', 'config', 'branding.ts'],
];

/**
 * @param {string} repoRoot
 * @returns {Promise<string|null>}
 */
export async function readBrandingSource(repoRoot) {
  for (const segments of BRANDING_RELATIVE_PATHS) {
    try {
      return await fs.readFile(path.join(repoRoot, ...segments), 'utf8');
    } catch {
      // try next location
    }
  }
  return null;
}

/**
 * @typedef {{ displayName: string; legalAuthor: string; warnings: string[] }} RepoIdentity
 */

/**
 * Read canonical product display name and legal author for rename --from / --from-legal.
 * Falls back to template defaults if files are missing or unparsable.
 *
 * @param {string} repoRoot
 * @returns {Promise<RepoIdentity>}
 */
export async function detectRepoIdentity(repoRoot) {
  /** @type {string[]} */
  const warnings = [];
  let displayName = DEFAULT_DISPLAY;
  let legalAuthor = DEFAULT_LEGAL;

  const brandingText = await readBrandingSource(repoRoot);
  if (brandingText) {
    const m = brandingText.match(/displayName:\s*['"]([^'"]+)['"]/);
    if (m?.[1]) {
      displayName = m[1].trim();
    } else {
      warnings.push(
        'Could not parse displayName from branding.ts; using default.'
      );
    }
  } else {
    warnings.push(
      `Missing or unreadable branding file; using default display name (${DEFAULT_DISPLAY}).`
    );
  }

  const pkgPath = path.join(repoRoot, 'package.json');
  try {
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const author = typeof pkg.author === 'string' ? pkg.author.trim() : '';
    if (author) {
      legalAuthor = author;
    } else {
      warnings.push(
        'package.json has no string author; using default legal entity name.'
      );
    }
  } catch {
    warnings.push(
      `Could not read package.json author; using default legal entity (${DEFAULT_LEGAL}).`
    );
  }

  return { displayName, legalAuthor, warnings };
}
