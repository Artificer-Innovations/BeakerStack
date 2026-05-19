#!/usr/bin/env node
// Personalizes BeakerStack email templates with project branding.
// Run: node scripts/personalize-email-templates.mjs
// Or:  npm run email:personalize

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'supabase', 'templates');
const CONFIG_TOML = join(ROOT, 'supabase', 'config.toml');
const EJECTION_MARKER = 'beakerstack-email:customized';
const NON_INTERACTIVE = process.argv.includes('--non-interactive');

// --- Read branding from source ---
function readBrandingValue(file, key) {
  try {
    const src = readFileSync(file, 'utf8');
    const match = src.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
    return match ? match[1] : null;
  } catch { return null; }
}

const brandingFile = join(ROOT, 'packages', 'shared', 'src', 'config', 'branding.ts');
const colorsFile = join(ROOT, 'packages', 'shared', 'src', 'theme', 'colors.ts');

const defaultProductName = readBrandingValue(brandingFile, 'displayName') ?? 'BeakerStack';

// Try to extract primary color — look for common patterns
function readPrimaryColor(file) {
  try {
    const src = readFileSync(file, 'utf8');
    // Match: brand: '#...' or primary: '#...'
    const match = src.match(/brand(?:Color)?['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8})/);
    return match ? match[1] : '#6366f1';
  } catch { return '#6366f1'; }
}
const defaultBrandColor = readPrimaryColor(colorsFile);

// --- Prompt helper ---
async function prompt(question, defaultVal) {
  if (NON_INTERACTIVE) return defaultVal;
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [${defaultVal}]: `, answer => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

// --- Check enable_confirmations ---
function checkConfirmations() {
  try {
    const toml = readFileSync(CONFIG_TOML, 'utf8');
    if (/^\s*enable_confirmations\s*=\s*false/m.test(toml)) {
      console.log('\ni  Note: enable_confirmations = false in supabase/config.toml.');
      console.log('   Signup confirmation emails are dormant until you set it to true.');
      console.log('   See docs/EMAIL_TEMPLATES.md for details.\n');
    }
  } catch { /* no-op */ }
}

// --- Main ---
async function main() {
  console.log('BeakerStack Email Template Personalization\n');
  checkConfirmations();

  const productName = await prompt('Product name', defaultProductName);
  const brandColor = await prompt('Brand color (hex)', defaultBrandColor);
  const senderName = await prompt('Sender name', `${productName} Team`);
  const supportEmail = await prompt('Support email', 'support@example.com');
  const companyAddress = await prompt('Company address (CAN-SPAM required)', '123 Main St, City, State 00000, Country');

  const replacements = {
    '{{PRODUCT_NAME}}': productName,
    '{{BRAND_COLOR}}': brandColor,
    '{{SENDER_NAME}}': senderName,
    '{{SUPPORT_EMAIL}}': supportEmail,
    '{{COMPANY_ADDRESS}}': companyAddress,
  };

  // Personalize template files
  let files;
  try {
    files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html') || f.endsWith('.txt'));
  } catch {
    console.error('x  supabase/templates/ not found. Make sure you have the templates directory.');
    process.exit(1);
  }

  let modified = 0, skipped = 0;
  for (const file of files) {
    const path = join(TEMPLATES_DIR, file);
    const content = readFileSync(path, 'utf8');
    if (content.includes(EJECTION_MARKER)) {
      console.log(`!  Skipping ${file} — marked as customized.`);
      skipped++;
      continue;
    }
    let updated = content;
    for (const [token, value] of Object.entries(replacements)) {
      updated = updated.replaceAll(token, value);
    }
    if (updated !== content) {
      writeFileSync(path, updated, 'utf8');
      console.log(`ok ${file}`);
      modified++;
    }
  }

  // Personalize config.toml subject lines
  try {
    const toml = readFileSync(CONFIG_TOML, 'utf8');
    let updatedToml = toml;
    for (const [token, value] of Object.entries(replacements)) {
      updatedToml = updatedToml.replaceAll(token, value);
    }
    if (updatedToml !== toml) {
      writeFileSync(CONFIG_TOML, updatedToml, 'utf8');
      console.log('ok supabase/config.toml (subject lines)');
      modified++;
    }
  } catch { /* config.toml optional */ }

  console.log(`\nDone — ${modified} file(s) updated, ${skipped} skipped.`);
  if (!NON_INTERACTIVE) {
    console.log('\nNext steps:');
    console.log('  1. Enable SMTP in supabase/config.toml if sending via custom domain');
    console.log('  2. Set SMTP_* vars in .env.local');
    console.log('  3. Run: supabase stop && supabase start to apply config changes');
    console.log('  4. Test with Inbucket at http://localhost:54324');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
