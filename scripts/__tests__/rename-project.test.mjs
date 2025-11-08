import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tokenizeName,
  buildNameVariants,
  buildReplacementPairs,
  findRemainingOccurrences
} from '../rename-project.mjs';

const BASE_NAME = 'Beaker Stack';

const normalizeToTokens = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());

const tokens = normalizeToTokens(BASE_NAME);
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const titleCase = tokens.map(capitalize).join(' ');
const pascalCase = tokens.map(capitalize).join('');
const camelCase = [tokens[0], ...tokens.slice(1).map(capitalize)].join('');
const kebabCase = tokens.join('-');
const snakeCase = tokens.join('_');
const upperSnakeCase = tokens.map((token) => token.toUpperCase()).join('_');
const upperFlat = tokens.map((token) => token.toUpperCase()).join('');
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

  const map = new Map(replacements.map((pair) => [pair.from, pair.to]));

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

