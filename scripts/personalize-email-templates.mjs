#!/usr/bin/env node
// Personalizes BeakerStack email templates with project branding.
// Reads pure placeholders from supabase/templates/ and writes deploy artifacts
// to supabase/templates/generated/. Never mutates the pure source tree.
// Run: node scripts/personalize-email-templates.mjs
// Or:  npm run email:personalize

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { parseDotEnv } from './lib/setup-dotenv.mjs';
import { resolveApexHint } from './setup-email-dns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'supabase', 'templates');
const GENERATED_DIR = join(TEMPLATES_DIR, 'generated');
const CONFIG_TOML = join(ROOT, 'supabase', 'config.toml');
const PERSONALIZATION_FILE = join(TEMPLATES_DIR, '.personalization.json');
const NON_INTERACTIVE = process.argv.includes('--non-interactive');

// Parse CLI flags for non-interactive overrides
function parseFlag(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
const flagSupportEmail = parseFlag('support-email');
const flagCompanyAddress = parseFlag('company-address');
const flagLogoUrl = parseFlag('logo-url');

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
    readBrandingValue(legalFile, 'mailingAddress') ??
    readBrandingValue(legalFile, 'legalEntityName') ??
    '123 Main St, City, State 00000, Country'
  );
}

function loadPersonalizationRecord() {
  try {
    return JSON.parse(readFileSync(PERSONALIZATION_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function resolveLogoUrl(personalization) {
  if (flagLogoUrl) return flagLogoUrl;
  if (personalization?.LOGO_URL) return personalization.LOGO_URL;
  return '{{ .SiteURL }}/email-logo.png';
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

function applyReplacements(content, replacements) {
  let updated = content;
  for (const [token, value] of Object.entries(replacements)) {
    updated = updated.replaceAll(token, value);
  }
  return updated;
}

function listPureTemplateFiles() {
  return readdirSync(TEMPLATES_DIR).filter(
    f =>
      (f.endsWith('.html') || f.endsWith('.txt')) &&
      f !== '.personalization.json'
  );
}

// --- Main ---
async function main() {
  console.log('BeakerStack Email Template Personalization\n');
  checkConfirmations();

  const personalization = loadPersonalizationRecord();

  const productNameDefault =
    personalization?.PRODUCT_NAME ?? defaultProductName;
  const brandColorDefault = personalization?.BRAND_COLOR ?? defaultBrandColor;
  const senderNameDefault =
    personalization?.SENDER_NAME ?? `${productNameDefault} Team`;

  const suggestedSupportEmail = await defaultSupportEmail();
  const suggestedCompanyAddress = defaultCompanyAddress();

  const supportEmailDefault =
    personalization?.SUPPORT_EMAIL ?? suggestedSupportEmail;
  const companyAddressDefault =
    personalization?.COMPANY_ADDRESS ?? suggestedCompanyAddress;

  const productName = await prompt('Product name', productNameDefault);
  const brandColor = await prompt('Brand color (hex)', brandColorDefault);
  const senderName = await prompt('Sender name', senderNameDefault);

  let supportEmail;
  let companyAddress;
  if (NON_INTERACTIVE) {
    supportEmail = flagSupportEmail ?? supportEmailDefault;
    companyAddress = flagCompanyAddress ?? companyAddressDefault;
  } else {
    supportEmail = await prompt('Support email', supportEmailDefault);
    companyAddress = await prompt(
      'Company address (CAN-SPAM required)',
      companyAddressDefault
    );
  }

  const logoUrl = resolveLogoUrl(personalization);

  const replacements = {
    '{{PRODUCT_NAME}}': productName,
    '{{BRAND_COLOR}}': brandColor,
    '{{SENDER_NAME}}': senderName,
    ...(supportEmail ? { '{{SUPPORT_EMAIL}}': supportEmail } : {}),
    ...(companyAddress ? { '{{COMPANY_ADDRESS}}': companyAddress } : {}),
    '{{LOGO_URL}}': logoUrl,
  };

  mkdirSync(GENERATED_DIR, { recursive: true });

  let files;
  try {
    files = listPureTemplateFiles();
  } catch {
    console.error(
      'x  supabase/templates/ not found. Make sure you have the templates directory.'
    );
    process.exit(1);
  }

  let generated = 0;
  for (const file of files) {
    const sourcePath = join(TEMPLATES_DIR, file);
    const content = readFileSync(sourcePath, 'utf8');
    const updated = applyReplacements(content, replacements);
    const outputPath = join(GENERATED_DIR, file);
    writeFileSync(outputPath, updated, 'utf8');
    console.log(`ok generated/${file}`);
    generated++;
  }

  const newState = {
    PRODUCT_NAME: productName,
    BRAND_COLOR: brandColor,
    SENDER_NAME: senderName,
    ...(supportEmail ? { SUPPORT_EMAIL: supportEmail } : {}),
    ...(companyAddress ? { COMPANY_ADDRESS: companyAddress } : {}),
    LOGO_URL: logoUrl,
  };
  writeFileSync(
    PERSONALIZATION_FILE,
    JSON.stringify(newState, null, 2) + '\n',
    'utf8'
  );

  console.log(
    `\nDone — ${generated} file(s) written to supabase/templates/generated/.`
  );
  if (!NON_INTERACTIVE) {
    console.log('\nNext steps:');
    console.log(
      '  1. Commit supabase/templates/generated/ (not the pure templates/)'
    );
    console.log(
      '  2. Run: npm run setup:email (merges SMTP_* into .env.local and enables auth SMTP in config.toml)'
    );
    console.log(
      '  3. Run: npm run email:materialize-config && supabase stop && supabase start'
    );
    console.log(
      '  4. Test signup confirmation in Inbucket at http://localhost:54324'
    );
    console.log(
      '  Note: materialize-config substitutes __PRODUCT_NAME__ in config.toml for local use; git restore supabase/config.toml to reset tokens.'
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
