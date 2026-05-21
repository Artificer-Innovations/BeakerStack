import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatTxtValue,
  qualifyRecordNameForZone,
  resolveRoute53Ttl,
} from '../lib/setup-route53-email-records.mjs';
import {
  defaultSendingDomain,
  resolveApexHint,
  senderDisplayNameFromBranding,
  uncommentSmtpSection,
} from '../setup-email-dns.mjs';

// --- qualifyRecordNameForZone ---

describe('qualifyRecordNameForZone', () => {
  const apex = 'beakerstack.com';
  const sending = 'auth.beakerstack.com';

  it('appends apex for Resend auth-relative DKIM host', () => {
    assert.equal(
      qualifyRecordNameForZone('resend._domainkey.auth', apex, sending),
      'resend._domainkey.auth.beakerstack.com.'
    );
  });

  it('appends apex for Resend send.auth MX/SPF hosts', () => {
    assert.equal(
      qualifyRecordNameForZone('send.auth', apex, sending),
      'send.auth.beakerstack.com.'
    );
  });

  it('keeps already-qualified names', () => {
    assert.equal(
      qualifyRecordNameForZone(
        'resend._domainkey.auth.beakerstack.com',
        apex,
        sending
      ),
      'resend._domainkey.auth.beakerstack.com.'
    );
  });
});

// --- resolveRoute53Ttl ---

describe('resolveRoute53Ttl', () => {
  it('maps Resend "Auto" to default 300', () => {
    assert.equal(resolveRoute53Ttl('Auto'), 300);
    assert.equal(resolveRoute53Ttl('auto'), 300);
  });

  it('passes through positive integers', () => {
    assert.equal(resolveRoute53Ttl(600), 600);
    assert.equal(resolveRoute53Ttl('3600'), 3600);
  });

  it('defaults when ttl is missing', () => {
    assert.equal(resolveRoute53Ttl(undefined), 300);
  });
});

// --- email-dns defaults ---

describe('defaultSendingDomain', () => {
  it('prefixes auth. for apex domain', () => {
    assert.equal(
      defaultSendingDomain('beakerstack.com'),
      'auth.beakerstack.com'
    );
  });

  it('leaves auth subdomain unchanged', () => {
    assert.equal(
      defaultSendingDomain('auth.beakerstack.com'),
      'auth.beakerstack.com'
    );
  });

  it('normalizes casing and trailing dot', () => {
    assert.equal(
      defaultSendingDomain('BeakerStack.COM.'),
      'auth.beakerstack.com'
    );
  });
});

describe('senderDisplayNameFromBranding', () => {
  it('appends Notifications to display name', () => {
    assert.equal(
      senderDisplayNameFromBranding('Beaker Stack'),
      'Beaker Stack Notifications'
    );
  });
});

describe('resolveApexHint', () => {
  it('prefers explicit PR_PREVIEW_DOMAIN', async () => {
    const apex = await resolveApexHint(process.cwd(), 'custom.example');
    assert.equal(apex, 'custom.example');
  });

  it('falls back to branding flatName.com when no env hint', async () => {
    const apex = await resolveApexHint(process.cwd(), '');
    assert.equal(apex, 'beakerstack.com');
  });
});

// --- formatTxtValue ---

describe('formatTxtValue', () => {
  it('wraps a short value in double-quotes', () => {
    assert.equal(
      formatTxtValue('v=spf1 include:amazonses.com ~all'),
      '"v=spf1 include:amazonses.com ~all"'
    );
  });

  it('returns a single quoted chunk for a value exactly 255 chars', () => {
    const value = 'a'.repeat(255);
    const result = formatTxtValue(value);
    assert.equal(result, `"${value}"`);
    assert.equal(result.includes('" "'), false);
  });

  it('splits a value longer than 255 chars into 255-char quoted chunks', () => {
    const value = 'b'.repeat(512);
    const result = formatTxtValue(value);
    const chunks = result.split('" "');
    assert.equal(chunks.length, 3); // 255 + 255 + 2 = 512
    assert.ok(result.startsWith('"'));
    assert.ok(result.endsWith('"'));
    // Each chunk (stripping surrounding quotes) should be ≤ 255 chars
    for (const c of result.match(/"[^"]*"/g)) {
      assert.ok(c.length - 2 <= 255, `chunk too long: ${c.length - 2}`);
    }
  });

  it('strips pre-existing surrounding double-quotes before chunking', () => {
    const inner = 'v=DKIM1; k=rsa; p=abc';
    const result = formatTxtValue(`"${inner}"`);
    assert.equal(result, `"${inner}"`);
  });

  it('handles an empty string', () => {
    assert.equal(formatTxtValue(''), '""');
  });

  it('splits a realistic DKIM key (> 255 chars) into valid Route 53 multi-string format', () => {
    const dkimKey = 'p=' + 'M'.repeat(400);
    const result = formatTxtValue(dkimKey);
    const chunks = result.match(/"[^"]*"/g);
    assert.ok(chunks.length >= 2, 'expected multiple chunks for long DKIM key');
    assert.equal(chunks.map(c => c.slice(1, -1)).join(''), dkimKey);
  });
});

// --- uncommentSmtpSection ---

describe('uncommentSmtpSection', () => {
  const commentedBlock = `# Use a production-ready SMTP server
# [auth.email.smtp]
# enabled = true
# host = "smtp.sendgrid.net"
# port = 587
# user = "apikey"
# pass = "env(SENDGRID_API_KEY)"
# admin_email = "admin@email.com"
# sender_name = "Admin"

[auth.sms]
`;

  it('uncomments the smtp block and replaces values with Resend env-var refs', () => {
    const result = uncommentSmtpSection(commentedBlock);
    assert.ok(
      result.includes('[auth.email.smtp]'),
      'section header should be uncommented'
    );
    assert.ok(
      result.includes('host = "env(SMTP_HOST)"'),
      'host should use env var'
    );
    assert.ok(
      result.includes('user = "env(SMTP_USER)"'),
      'user should use env var'
    );
    assert.ok(result.includes('port = 587'), 'port should be 587');
    assert.ok(
      result.includes('pass = "env(SMTP_PASS)"'),
      'pass should use env var'
    );
    assert.ok(
      !result.includes('# [auth.email.smtp]'),
      'commented header should be gone'
    );
    assert.ok(
      !result.includes('smtp.sendgrid.net'),
      'sendgrid placeholder should be gone'
    );
    assert.ok(
      !result.includes('# Use a production-ready SMTP server'),
      'prose comment should be removed'
    );
  });

  it('does not bleed into adjacent sections', () => {
    const result = uncommentSmtpSection(commentedBlock);
    assert.ok(
      result.includes('[auth.sms]'),
      'adjacent [auth.sms] section must remain'
    );
  });

  it('is idempotent — no-op if block already uncommented', () => {
    // Strip both the prose comment and the commented section header block
    const alreadyUncommented = commentedBlock.replace(
      /(?:# [^\n]+\n)?# \[auth\.email\.smtp\]\n(# [^\n]*\n)*/,
      ''
    );
    const withUncommented = alreadyUncommented.replace(
      '[auth.sms]',
      '[auth.email.smtp]\nenabled = true\nhost = "env(SMTP_HOST)"\n\n[auth.sms]'
    );
    const result = uncommentSmtpSection(withUncommented);
    assert.equal(result, withUncommented);
  });

  it('handles the block at EOF (no trailing section)', () => {
    const eof = '# [auth.email.smtp]\n# enabled = true\n# host = "x"\n';
    const result = uncommentSmtpSection(eof);
    assert.ok(result.includes('[auth.email.smtp]'));
    assert.ok(!result.includes('# [auth.email.smtp]'));
  });
});
