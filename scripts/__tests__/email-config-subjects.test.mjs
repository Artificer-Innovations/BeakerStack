import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  readPersonalizationBranding,
  substituteConfigTomlTokens,
} from '../lib/email-config-subjects.mjs';

test('substituteConfigTomlTokens replaces product and brand tokens', () => {
  const input =
    'subject = "Welcome to __PRODUCT_NAME__"\nbrand = "__BRAND_COLOR__"';
  const output = substituteConfigTomlTokens(input, {
    productName: 'Acme App',
    brandColor: '#ff0000',
  });
  assert.match(output, /Welcome to Acme App/);
  assert.match(output, /#ff0000/);
  assert.doesNotMatch(output, /__PRODUCT_NAME__/);
  assert.doesNotMatch(output, /__BRAND_COLOR__/);
});

test('substituteConfigTomlTokens skips missing values', () => {
  const input = 'subject = "__PRODUCT_NAME__"';
  assert.equal(
    substituteConfigTomlTokens(input, { brandColor: '#00ff00' }),
    input
  );
  assert.equal(
    substituteConfigTomlTokens(input, { productName: 'Acme App' }),
    'subject = "Acme App"'
  );
});

test('readPersonalizationBranding reads branding from personalization file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'email-config-subjects-'));
  const path = join(dir, '.personalization.json');
  writeFileSync(
    path,
    JSON.stringify({
      PRODUCT_NAME: 'My Product',
      BRAND_COLOR: '#6366f1',
    })
  );

  assert.deepEqual(readPersonalizationBranding(path), {
    productName: 'My Product',
    brandColor: '#6366f1',
  });
});

test('readPersonalizationBranding defaults product name when missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'email-config-subjects-'));
  const path = join(dir, '.personalization.json');
  writeFileSync(path, JSON.stringify({ BRAND_COLOR: '#111111' }));

  assert.deepEqual(readPersonalizationBranding(path), {
    productName: 'BeakerStack',
    brandColor: '#111111',
  });
});
