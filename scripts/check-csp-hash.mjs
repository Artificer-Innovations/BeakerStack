#!/usr/bin/env node
/**
 * Verifies that the SHA-256 hash of the inline theme script in apps/web/index.html
 * matches the value recorded in the active CSP directive in
 * infra/aws/pr-preview-stack.yml.
 *
 * Works for both phases:
 *   Phase 1 (report-only): hash must appear in the Content-Security-Policy-Report-Only
 *                          value under CustomHeadersConfig.
 *   Phase 2 (enforcement): hash must appear in the ContentSecurityPolicy value under
 *                          SecurityHeadersConfig.
 *
 * Run: node scripts/check-csp-hash.mjs
 * CI: triggered on changes to index.html or pr-preview-stack.yml
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = resolve(root, 'apps/web/index.html');
const cfnPath = resolve(root, 'infra/aws/pr-preview-stack.yml');

const html = readFileSync(htmlPath, 'utf8');
const cfn = readFileSync(cfnPath, 'utf8');

// Extract content between <script id="csp-inline-theme"> and </script>
const scriptMatch = html.match(/<script\b[^>]*\bid="csp-inline-theme"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('ERROR: <script id="csp-inline-theme"> not found in apps/web/index.html');
  console.error('Add that id attribute to the inline theme script so this check can locate it.');
  process.exit(1);
}

const hash = createHash('sha256').update(scriptMatch[1], 'utf8').digest('base64');
const hashToken = `'sha256-${hash}'`;

// Phase 1: Content-Security-Policy-Report-Only in CustomHeadersConfig
// Matches: "- Header: Content-Security-Policy-Report-Only\n  Value: "..."
const reportOnlyMatch = cfn.match(
  /- Header:\s+Content-Security-Policy-Report-Only\s+Value:\s+"([^"]+)"/
);

// Phase 2: ContentSecurityPolicy in SecurityHeadersConfig
// Matches: "ContentSecurityPolicy: "..."" (indented, within SecurityHeadersConfig block)
const enforcementMatch = cfn.match(
  /ContentSecurityPolicy:\s+"([^"]+)"/
);

const activeMatch = reportOnlyMatch || enforcementMatch;

if (!activeMatch) {
  console.error('ERROR: No CSP directive found in infra/aws/pr-preview-stack.yml.');
  console.error('Expected either:');
  console.error('  - Header: Content-Security-Policy-Report-Only  (Phase 1 / report-only)');
  console.error('  - ContentSecurityPolicy: "..."                 (Phase 2 / enforcement)');
  process.exit(1);
}

const cspValue = activeMatch[1];
const phase = reportOnlyMatch ? 'Phase 1 (Content-Security-Policy-Report-Only)' : 'Phase 2 (ContentSecurityPolicy)';
const location = reportOnlyMatch
  ? 'CustomHeadersConfig → Content-Security-Policy-Report-Only Value'
  : 'SecurityHeadersConfig → ContentSecurityPolicy';

if (!cspValue.includes(hashToken)) {
  console.error(`FAIL: CSP hash mismatch in ${phase}.\n`);
  console.error('The inline theme script in apps/web/index.html has changed (or the hash');
  console.error(`in infra/aws/pr-preview-stack.yml is stale).\n`);
  console.error(`Update the sha256-... token in ${location}`);
  console.error(`in infra/aws/pr-preview-stack.yml to:\n`);
  console.error(`  ${hashToken}\n`);
  process.exit(1);
}

console.log(`OK: CSP inline-script hash matches in ${phase} (${hashToken})`);
