import test from 'node:test';
import assert from 'node:assert/strict';

import {
  slugBaseFromBrandingText,
  slugBaseFromAppConfigText,
} from '../setup-full.mjs';

// ---------------------------------------------------------------------------
// slugBaseFromBrandingText
// ---------------------------------------------------------------------------

test('slugBaseFromBrandingText returns flatName when present', () => {
  const text = `export const BRANDING = {
  flatName: 'poststack',
  displayName: 'Post Stack',
} as const;`;
  assert.equal(slugBaseFromBrandingText(text), 'poststack');
});

test('slugBaseFromBrandingText falls back to displayName when flatName absent', () => {
  const text = `export const BRANDING = {
  displayName: 'My App',
} as const;`;
  assert.equal(slugBaseFromBrandingText(text), 'myapp');
});

test('slugBaseFromBrandingText returns null for null input', () => {
  assert.equal(slugBaseFromBrandingText(null), null);
});

test('slugBaseFromBrandingText returns null when no name fields found', () => {
  const text = `export const BRANDING = { shortName: 'MA' } as const;`;
  assert.equal(slugBaseFromBrandingText(text), null);
});

// ---------------------------------------------------------------------------
// slugBaseFromAppConfigText
// ---------------------------------------------------------------------------

test('slugBaseFromAppConfigText derives slug base from name field', () => {
  const text = `module.exports = { name: 'Beaker Stack', slug: 'beaker-stack' };`;
  assert.equal(slugBaseFromAppConfigText(text), 'beakerstack');
});

test('slugBaseFromAppConfigText falls back to slug field when name is absent', () => {
  const text = `module.exports = { slug: 'my-app' };`;
  assert.equal(slugBaseFromAppConfigText(text), 'myapp');
});

test('slugBaseFromAppConfigText returns null for null input', () => {
  assert.equal(slugBaseFromAppConfigText(null), null);
});

test('slugBaseFromAppConfigText returns null when no name or slug found', () => {
  const text = `module.exports = { version: '1.0.0' };`;
  assert.equal(slugBaseFromAppConfigText(text), null);
});
