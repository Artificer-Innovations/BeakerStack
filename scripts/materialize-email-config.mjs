#!/usr/bin/env node
// Materialize tokenized auth email subjects in supabase/config.toml for local
// Supabase or hosted config push. Restores are the caller's responsibility
// (sync-supabase-auth-config.sh swaps back automatically).
//
// Usage:
//   node scripts/materialize-email-config.mjs [--in-place]
//   node scripts/materialize-email-config.mjs --output /tmp/config.toml

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  readPersonalizationBranding,
  substituteConfigTomlTokens,
} from './lib/email-config-subjects.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function parseFlag(name) {
  const eqPrefix = `--${name}=`;
  const eqArg = process.argv.find(a => a.startsWith(eqPrefix));
  if (eqArg) return eqArg.slice(eqPrefix.length);

  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (
    idx !== -1 &&
    process.argv[idx + 1] &&
    !process.argv[idx + 1].startsWith('-')
  ) {
    return process.argv[idx + 1];
  }
  return null;
}

const configPath = parseFlag('config') ?? join(ROOT, 'supabase', 'config.toml');
const personalizationPath =
  parseFlag('personalization') ??
  join(ROOT, 'supabase', 'templates', '.personalization.json');
const outputPath = parseFlag('output');
const inPlace = process.argv.includes('--in-place');

const branding = readPersonalizationBranding(personalizationPath);
const materialized = substituteConfigTomlTokens(
  readFileSync(configPath, 'utf8'),
  {
    productName: branding.productName,
    brandColor: branding.brandColor,
  }
);

if (inPlace) {
  writeFileSync(configPath, materialized, 'utf8');
} else if (outputPath) {
  writeFileSync(outputPath, materialized, 'utf8');
} else {
  console.error('Error: pass --in-place or --output <path>.');
  process.exit(1);
}
