#!/usr/bin/env node
// Personalizes BeakerStack email templates with project branding.
// Run: node scripts/personalize-email-templates.mjs
// Or:  npm run email:personalize

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { parseDotEnv } from './lib/setup-dotenv.mjs';
import { resolveApexHint } from './setup-email-dns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'supabase', 'templates');
const CONFIG_TOML = join(ROOT, 'supabase', 'config.toml');
const PERSONALIZATION_FILE = join(TEMPLATES_DIR, '.personalization.json');
const EJECTION_MARKER = 'beakerstack-email:customized';
const NON_INTERACTIVE = process.argv.includes('--non-interactive');

// Parse CLI flags for non-interactive CAN-SPAM overrides
function parseFlag(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
const flagSupportEmail = parseFlag('support-email');
const flagCompanyAddress = parseFlag('company-address');

// --- Read branding from source ---
function readBrandingValue(file, key) {
  try {
    const src = readFileSync(file, 'utf8');
    const match = src.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const brandingFile = join(
  ROOT,
  'packages',
  'shared',
  'src',
  'config',
  'branding.ts'
);
const colorsFile = join(
  ROOT,
  'packages',
  'shared',
  'src',
  'theme',
  'colors.ts'
);

const defaultProductName =
  readBrandingValue(brandingFile, 'displayName') ?? 'BeakerStack';

// Try to extract primary brand color — understands the actual colors.ts structure:
// `brand: indigo[600]` where `indigo` is a local const with hex values.
function readPrimaryColor(file) {
  try {
    const src = readFileSync(file, 'utf8');

    // Try direct hex first: brand/primary: '#...'
    const hexMatch = src.match(
      /(?:brand|primary(?:Color)?)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8})/
    );
    if (hexMatch) return hexMatch[1];

    // Try `brand: colorName[shade]` or `primary: colors.colorName[shade]`
    const tokenMatch = src.match(
      /(?:brand|primary(?:Color)?)['"]?\s*:\s*(?:colors\.)?(\w+)\[(\d+)\]/
    );
    if (tokenMatch) {
      const [, colorName, shade] = tokenMatch;
      // Match `const indigo = { ... }` — avoid false positives from comments or
      // other objects that mention `indigo[600]` before the palette definition.
      const paletteMatch = src.match(
        new RegExp(
          `const\\s+${colorName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as const`,
          'm'
        )
      );
      if (paletteMatch) {
        const shadeMatch = paletteMatch[1].match(
          new RegExp(`${shade}\\s*:\\s*['"]?(#[0-9a-fA-F]{3,8})`)
        );
        if (shadeMatch) return shadeMatch[1];
      }
    }
    return '#6366f1';
  } catch {
    return '#6366f1';
  }
}
const defaultBrandColor = readPrimaryColor(colorsFile);

const legalFile = join(ROOT, 'packages', 'shared', 'src', 'config', 'legal.ts');

/** @returns {Promise<string>} */
async function resolveDefaultApexDomain() {
  for (const rel of ['.env.local', '.env.cloud.generated.local']) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    try {
      const env = parseDotEnv(readFileSync(path, 'utf8'));
      if (env.PR_PREVIEW_DOMAIN?.trim()) {
        return resolveApexHint(ROOT, env.PR_PREVIEW_DOMAIN.trim());
      }
    } catch {
      /* try next file */
    }
  }
  return resolveApexHint(ROOT, '');
}

/** @returns {Promise<string>} */
async function defaultSupportEmail() {
  const apex = await resolveDefaultApexDomain();
  return apex ? `support@${apex}` : 'support@example.com';
}

function defaultCompanyAddress() {
  return (
    readBrandingValue(legalFile, 'legalEntityName') ??
    '123 Main St, City, State 00000, Country'
  );
}

// --- Prompt helper ---
async function prompt(question, defaultVal) {
  if (NON_INTERACTIVE) return defaultVal;
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question} [${defaultVal}]: `, answer => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

// --- Signup confirmation note ---
function checkConfirmations() {
  try {
    const toml = readFileSync(CONFIG_TOML, 'utf8');
    const emailSection =
      toml.match(/\[auth\.email\][\s\S]*?(?=\n\[|$)/)?.[0] ?? '';
    if (/enable_confirmations\s*=\s*true/.test(emailSection)) {
      console.log(
        '\ni  Signup email confirmation is enabled (enable_confirmations = true).'
      );
      console.log(
        '   New users must verify email before sign-in. Deliver mail with npm run setup:email'
      );
      console.log(
        '   (or SMTP_* in .env.local); local testing: Inbucket at http://localhost:54324.\n'
      );
    } else if (/enable_confirmations\s*=\s*false/.test(emailSection)) {
      console.log(
        '\ni  Note: enable_confirmations is false under [auth.email] in supabase/config.toml.'
      );
      console.log(
        '   The template default is true; run npm run setup:email or see docs/EMAIL_TEMPLATES.md.\n'
      );
    }
  } catch {
    /* no-op */
  }
}

// --- Load previous personalization state ---
function loadPreviousPersonalization() {
  try {
    return JSON.parse(readFileSync(PERSONALIZATION_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// --- Reverse previous personalization in content ---
function reversePersonalization(content, prev) {
  let reversed = content;
  const tokenMap = {
    PRODUCT_NAME: '{{PRODUCT_NAME}}',
    BRAND_COLOR: '{{BRAND_COLOR}}',
    SENDER_NAME: '{{SENDER_NAME}}',
    SUPPORT_EMAIL: '{{SUPPORT_EMAIL}}',
    COMPANY_ADDRESS: '{{COMPANY_ADDRESS}}',
  };
  for (const [key, token] of Object.entries(tokenMap)) {
    if (prev[key]) {
      reversed = reversed.replaceAll(prev[key], token);
    }
  }
  return reversed;
}

// --- Reverse previous personalization in config.toml ---
function reverseTomlPersonalization(content, prev) {
  let reversed = content;
  if (prev.PRODUCT_NAME) {
    reversed = reversed.replaceAll(prev.PRODUCT_NAME, '__PRODUCT_NAME__');
  }
  if (prev.BRAND_COLOR) {
    reversed = reversed.replaceAll(prev.BRAND_COLOR, '__BRAND_COLOR__');
  }
  return reversed;
}

// --- Main ---
async function main() {
  console.log('BeakerStack Email Template Personalization\n');
  checkConfirmations();

  const prev = loadPreviousPersonalization();
  if (prev) {
    console.log(
      'i  Previous personalization found — will restore placeholders before re-applying.\n'
    );
  }

  const productName = await prompt('Product name', defaultProductName);
  const brandColor = await prompt('Brand color (hex)', defaultBrandColor);
  const senderName = await prompt('Sender name', `${productName} Team`);

  const suggestedSupportEmail = await defaultSupportEmail();
  const suggestedCompanyAddress = defaultCompanyAddress();

  // CAN-SPAM fields — default support@<apex> from PR_PREVIEW_DOMAIN or branding flatName.com
  let supportEmail;
  let companyAddress;
  if (NON_INTERACTIVE) {
    supportEmail = flagSupportEmail ?? suggestedSupportEmail;
    companyAddress = flagCompanyAddress ?? suggestedCompanyAddress;
  } else {
    supportEmail = await prompt('Support email', suggestedSupportEmail);
    companyAddress = await prompt(
      'Company address (CAN-SPAM required)',
      suggestedCompanyAddress
    );
  }

  const replacements = {
    '{{PRODUCT_NAME}}': productName,
    '{{BRAND_COLOR}}': brandColor,
    '{{SENDER_NAME}}': senderName,
    ...(supportEmail ? { '{{SUPPORT_EMAIL}}': supportEmail } : {}),
    ...(companyAddress ? { '{{COMPANY_ADDRESS}}': companyAddress } : {}),
  };

  // config.toml uses __PRODUCT_NAME__ (double underscores) to avoid Go template conflicts
  const tomlReplacements = {
    __PRODUCT_NAME__: productName,
    __BRAND_COLOR__: brandColor,
  };

  // Personalize template files
  let files;
  try {
    files = readdirSync(TEMPLATES_DIR).filter(
      f => f.endsWith('.html') || f.endsWith('.txt')
    );
  } catch {
    console.error(
      'x  supabase/templates/ not found. Make sure you have the templates directory.'
    );
    process.exit(1);
  }

  let modified = 0,
    skipped = 0;
  for (const file of files) {
    const path = join(TEMPLATES_DIR, file);
    let content = readFileSync(path, 'utf8');
    if (content.includes(EJECTION_MARKER)) {
      console.log(`!  Skipping ${file} — marked as customized.`);
      skipped++;
      continue;
    }
    // Reverse previous personalization so tokens are clean before re-applying
    if (prev) {
      content = reversePersonalization(content, prev);
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

  // Personalize config.toml subject lines (uses __PLACEHOLDER__ style, not {{}} Go template syntax)
  try {
    let toml = readFileSync(CONFIG_TOML, 'utf8');
    // Reverse previous personalization first
    if (prev) {
      toml = reverseTomlPersonalization(toml, prev);
    }
    let updatedToml = toml;
    for (const [token, value] of Object.entries(tomlReplacements)) {
      updatedToml = updatedToml.replaceAll(token, value);
    }
    if (updatedToml !== toml) {
      writeFileSync(CONFIG_TOML, updatedToml, 'utf8');
      console.log('ok supabase/config.toml (subject lines)');
      modified++;
    }
  } catch {
    /* config.toml optional */
  }

  // Save current personalization state for idempotent re-runs
  const newState = {
    PRODUCT_NAME: productName,
    BRAND_COLOR: brandColor,
    SENDER_NAME: senderName,
    ...(supportEmail ? { SUPPORT_EMAIL: supportEmail } : {}),
    ...(companyAddress ? { COMPANY_ADDRESS: companyAddress } : {}),
  };
  writeFileSync(
    PERSONALIZATION_FILE,
    JSON.stringify(newState, null, 2) + '\n',
    'utf8'
  );

  console.log(`\nDone — ${modified} file(s) updated, ${skipped} skipped.`);
  if (!NON_INTERACTIVE) {
    console.log('\nNext steps:');
    console.log(
      '  1. Run: npm run setup:email (merges SMTP_* into .env.local and enables auth SMTP in config.toml)'
    );
    console.log(
      '  2. Run: supabase stop && supabase start to apply config changes'
    );
    console.log(
      '  3. Test signup confirmation in Inbucket at http://localhost:54324'
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
