import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tokenizeName,
  buildNameVariants,
  buildReplacementPairs,
  findRemainingOccurrences,
  replaceAll,
  replaceFlatLowerPreservingScope,
  annotateReplacementsForPreserveMode,
  isPreserveUpstreamPath,
  resolvePreserveUpstream,
  PRESERVE_UPSTREAM_RELATIVE_PATHS,
} from '../rename-project.mjs';

const BASE_NAME = 'Beaker Stack';

const normalizeToTokens = name =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.toLowerCase());

const tokens = normalizeToTokens(BASE_NAME);
const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1);
const titleCase = tokens.map(capitalize).join(' ');
const pascalCase = tokens.map(capitalize).join('');
const camelCase = [tokens[0], ...tokens.slice(1).map(capitalize)].join('');
const kebabCase = tokens.join('-');
const snakeCase = tokens.join('_');
const upperSnakeCase = tokens.map(token => token.toUpperCase()).join('_');
const upperFlat = tokens.map(token => token.toUpperCase()).join('');
const flatLower = tokens.join('');

test('tokenizeName splits mixed separators and casing', () => {
  assert.deepEqual(tokenizeName(pascalCase), tokens);
  assert.deepEqual(tokenizeName(`${kebabCase} extra`), [...tokens, 'extra']);
  assert.deepEqual(tokenizeName(`${snakeCase} Extra`), [...tokens, 'extra']);
});

test('buildNameVariants derives consistent casing variants', () => {
  const variants = buildNameVariants(BASE_NAME);

  assert.equal(variants.titleCase, titleCase);
  assert.equal(variants.pascalCase, pascalCase);
  assert.equal(variants.camelCase, camelCase);
  assert.equal(variants.kebabCase, kebabCase);
  assert.equal(variants.snakeCase, snakeCase);
  assert.equal(variants.upperSnakeCase, upperSnakeCase);
  assert.equal(variants.upperFlat, upperFlat);
  assert.equal(variants.flatLower, flatLower);
});

test('buildReplacementPairs maps all primary variants', () => {
  const { replacements } = buildReplacementPairs(BASE_NAME, 'Acme App');

  const map = new Map(replacements.map(pair => [pair.from, pair.to]));

  assert.equal(map.get(titleCase), 'Acme App');
  assert.equal(map.get(pascalCase), 'AcmeApp');
  assert.equal(map.get(camelCase), 'acmeApp');
  assert.equal(map.get(kebabCase), 'acme-app');
  assert.equal(map.get(snakeCase), 'acme_app');
  assert.equal(map.get(upperSnakeCase), 'ACME_APP');
  assert.equal(map.get(upperFlat), 'ACMEAPP');
  assert.equal(map.get(flatLower), 'acmeapp');
});

test('findRemainingOccurrences detects legacy identifiers', () => {
  const patterns = [titleCase, pascalCase, flatLower];
  const content = `This file references ${pascalCase} and ${flatLower} but not others.`;

  const matches = findRemainingOccurrences(content, patterns);
  const expected = [pascalCase, flatLower].sort();

  assert.deepEqual(matches.slice().sort(), expected);
});

test('isPreserveUpstreamPath matches upgrade and versioning docs', () => {
  assert.equal(isPreserveUpstreamPath('docs/UPGRADING.md'), true);
  assert.equal(isPreserveUpstreamPath('docs/VERSIONING.md'), true);
  assert.equal(isPreserveUpstreamPath('CONTRIBUTING.md'), true);
  assert.equal(isPreserveUpstreamPath('docs/renaming.md'), false);
  assert.ok(PRESERVE_UPSTREAM_RELATIVE_PATHS.has('docs/UPGRADING.md'));
});

test('resolvePreserveUpstream defaults to preserve unless full rebrand', () => {
  assert.equal(resolvePreserveUpstream({}), true);
  assert.equal(resolvePreserveUpstream({ preserveUpstream: true }), true);
  assert.equal(resolvePreserveUpstream({ fullRebrand: true }), false);
  assert.equal(resolvePreserveUpstream({ preserveUpstream: false }), false);
  assert.equal(
    resolvePreserveUpstream({ preserveUpstream: true, fullRebrand: true }),
    false
  );
});

test('replaceFlatLowerPreservingScope keeps @beakerstack and compound identifiers', () => {
  const input = [
    `import x from '@beakerstack/billing';`,
    `const beakerstackBillingConfig = 1;`,
    `com.anonymous.beakerstack`,
    `productId: 'beakerstack'`,
  ].join('\n');

  const { updated, replacementsMade } = replaceFlatLowerPreservingScope(
    input,
    flatLower,
    'acmeapp'
  );

  assert.match(updated, /@beakerstack\/billing/);
  assert.match(updated, /beakerstackBillingConfig/);
  assert.match(updated, /com\.anonymous\.acmeapp/);
  assert.match(updated, /productId: 'acmeapp'/);
  assert.equal(replacementsMade, 2);
});

test('uniquePairs keeps flatlower when camelCase shares the same from token', () => {
  const { replacements } = buildReplacementPairs('Beaker', 'Acme');
  const annotated = annotateReplacementsForPreserveMode(replacements, true);
  const beakerPair = annotated.find(pair => pair.from === 'beaker');

  assert.ok(beakerPair);
  assert.equal(beakerPair.description, 'flatlower');
  assert.equal(beakerPair.preserveScope, true);
});

test('annotateReplacementsForPreserveMode marks flatlower only', () => {
  const { replacements } = buildReplacementPairs(BASE_NAME, 'Acme App');
  const annotated = annotateReplacementsForPreserveMode(replacements, true);
  const flat = annotated.find(pair => pair.description === 'flatlower');
  const title = annotated.find(pair => pair.description === 'Title case');

  assert.equal(flat?.preserveScope, true);
  assert.equal(title?.preserveScope, undefined);

  const passthrough = annotateReplacementsForPreserveMode(replacements, false);
  assert.equal(
    passthrough.find(pair => pair.description === 'flatlower')?.preserveScope,
    undefined
  );
});

test('replaceAll preserve mode rebrands display name and bundle id', () => {
  const { replacements } = buildReplacementPairs(BASE_NAME, 'Acme App');
  const annotated = annotateReplacementsForPreserveMode(replacements, true);
  const content = [
    titleCase,
    '@beakerstack/shared',
    'com.anonymous.beakerstack',
  ].join('\n');

  const { updated } = replaceAll(content, annotated);

  assert.match(updated, /Acme App/);
  assert.match(updated, /@beakerstack\/shared/);
  assert.match(updated, /com\.anonymous\.acmeapp/);
});

test('replaceAll full rebrand rewrites npm scope', () => {
  const { replacements } = buildReplacementPairs(BASE_NAME, 'Acme App');
  const content = '@beakerstack/billing and BeakerStack';

  const { updated } = replaceAll(content, replacements);

  assert.match(updated, /@acmeapp\/billing/);
  assert.match(updated, /AcmeApp/);
});
