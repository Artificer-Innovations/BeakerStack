import test from 'node:test';
import assert from 'node:assert/strict';

import {
  certDetailCoversApexAndWildcard,
  certNameSetCoversApexAndWildcard,
  certSummaryDefinitelyCovers,
  certSummaryNeedsDescribe,
  dnsNameSetFromCertSummary,
  normalizeApexDomain,
  route53ResourceIdToZoneId,
} from '../lib/setup-aws-discover.mjs';

test('normalizeApexDomain trims, lowercases, strips trailing dots', () => {
  assert.equal(normalizeApexDomain('  Example.COM. '), 'example.com');
  assert.equal(normalizeApexDomain('poststackapp.com'), 'poststackapp.com');
});

test('route53ResourceIdToZoneId strips /hostedzone/ prefix', () => {
  assert.equal(route53ResourceIdToZoneId('/hostedzone/Z123'), 'Z123');
  assert.equal(route53ResourceIdToZoneId('Z999'), 'Z999');
});

test('certNameSetCoversApexAndWildcard requires exact apex and *.apex', () => {
  const set = new Set(['example.com', '*.example.com']);
  assert.equal(certNameSetCoversApexAndWildcard('example.com', set), true);
  assert.equal(certNameSetCoversApexAndWildcard('ample.com', new Set(['x.ample.com', '*.ample.com'])), false);
});

test('dnsNameSetFromCertSummary merges primary and SAN summaries', () => {
  const set = dnsNameSetFromCertSummary('Example.COM.', ['*.example.com.']);
  assert.ok(set.has('example.com'));
  assert.ok(set.has('*.example.com'));
});

test('certSummaryDefinitelyCovers from list summary fields', () => {
  assert.equal(
    certSummaryDefinitelyCovers('poststackapp.com', {
      DomainName: 'poststackapp.com',
      SubjectAlternativeNameSummaries: ['*.poststackapp.com'],
    }),
    true,
  );
  assert.equal(
    certSummaryDefinitelyCovers('poststackapp.com', {
      DomainName: '*.poststackapp.com',
      SubjectAlternativeNameSummaries: ['poststackapp.com'],
    }),
    true,
  );
  assert.equal(
    certSummaryDefinitelyCovers('poststackapp.com', {
      DomainName: 'www.poststackapp.com',
      SubjectAlternativeNameSummaries: ['poststackapp.com'],
    }),
    false,
  );
});

test('certSummaryNeedsDescribe when primary is wildcard but SAN list incomplete', () => {
  assert.equal(
    certSummaryNeedsDescribe('poststackapp.com', {
      DomainName: '*.poststackapp.com',
      SubjectAlternativeNameSummaries: [],
    }),
    true,
  );
  assert.equal(
    certSummaryNeedsDescribe('poststackapp.com', {
      DomainName: '*.poststackapp.com',
      SubjectAlternativeNameSummaries: ['poststackapp.com'],
    }),
    false,
  );
});

test('certDetailCoversApexAndWildcard uses full SAN list', () => {
  assert.equal(
    certDetailCoversApexAndWildcard('poststackapp.com', {
      DomainName: '*.poststackapp.com',
      SubjectAlternativeNames: ['poststackapp.com', '*.poststackapp.com'],
    }),
    true,
  );
});
