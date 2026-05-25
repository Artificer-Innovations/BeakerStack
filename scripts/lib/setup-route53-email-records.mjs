/**
 * Route 53 email DNS UPSERT helper.
 * Maps Resend domain records → Route 53 change batch, handles TXT quoting + DKIM chunking,
 * optional DMARC record, pre-flight SPF warning, and trailing-dot normalization.
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  discoverRoute53PublicZonesForApex,
  route53ResourceIdToZoneId,
} from './setup-aws-discover.mjs';

/**
 * Format a TXT record value for Route 53: wrap in double-quotes, split at 255-char boundaries.
 * @param {string} value
 * @returns {string} e.g. `"chunk1..." "chunk2..."`
 */
export function formatTxtValue(value) {
  const raw = value.replace(/^"|"$/g, '');
  if (raw.length === 0) return '""';
  const chunks = [];
  for (let i = 0; i < raw.length; i += 255) {
    chunks.push(`"${raw.slice(i, i + 255)}"`);
  }
  return chunks.join(' ');
}

/**
 * Upsert Resend DNS records into Route 53, plus an optional DMARC record.
 *
 * @param {import('./setup-resend-api.mjs').ResendRecord[]} records from Resend
 * @param {{
 *   sendingDomain: string;
 *   hostedZoneId?: string;
 *   apexDomain: string;
 *   dmarc?: boolean;
 *   dmarcEmail?: string;
 *   awsProfileArgs?: string[];
 *   dryRun?: boolean;
 * }} opts
 * @returns {Promise<{ changeId: string; records: object[]; resolvedZoneId: string }>}
 */
export async function upsertEmailDnsRecords(records, opts) {
  const {
    sendingDomain,
    apexDomain,
    dmarc = false,
    dmarcEmail,
    awsProfileArgs = [],
    dryRun = false,
  } = opts;

  const hostedZoneId = await resolveHostedZone(
    opts.hostedZoneId,
    apexDomain,
    awsProfileArgs
  );
  const zoneId = route53ResourceIdToZoneId(hostedZoneId);

  const changes = buildChanges(records, {
    sendingDomain,
    apexDomain,
    dmarc,
    dmarcEmail,
  });

  if (dryRun) {
    console.log(
      `[dry-run] would UPSERT ${changes.length} DNS record(s) in Route 53 zone ${zoneId}:`
    );
    for (const c of changes) {
      const rrs = c.ResourceRecordSet;
      console.log(`  ${rrs.Type.padEnd(5)} ${rrs.Name}`);
    }
    return {
      changeId: 'dry-run',
      records: changes,
      resolvedZoneId: hostedZoneId,
    };
  }

  await checkExistingSpf(zoneId, sendingDomain, awsProfileArgs);

  const changeBatch = { Changes: changes };
  const tmpFile = path.join(
    tmpdir(),
    `beakerstack-r53-email-${Date.now()}.json`
  );
  // mode 0o600 — batch file contains hosted zone ID; restrict to current user
  writeFileSync(tmpFile, JSON.stringify(changeBatch, null, 2), { mode: 0o600 });

  try {
    const result = spawnSync(
      'aws',
      [
        'route53',
        'change-resource-record-sets',
        '--hosted-zone-id',
        zoneId,
        '--change-batch',
        `file://${tmpFile}`,
        ...awsProfileArgs,
      ],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      throw new Error(
        `aws route53 change-resource-record-sets failed:\n${result.stderr}`
      );
    }
    const out = JSON.parse(result.stdout);
    const changeId = out?.ChangeInfo?.Id ?? 'unknown';
    return { changeId, records: changes, resolvedZoneId: hostedZoneId };
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // best-effort temp batch file cleanup
    }
  }
}

// --- internals ---

async function resolveHostedZone(hostedZoneId, apexDomain, awsProfileArgs) {
  if (hostedZoneId) return hostedZoneId;

  let res;
  try {
    res = await discoverRoute53PublicZonesForApex(apexDomain, awsProfileArgs);
  } catch (err) {
    throw new Error(
      `Route 53 zone discovery threw an unexpected error for "${apexDomain}": ${err.message}.\n` +
        'Check that the AWS CLI is installed and your credentials are valid, or pass --hosted-zone-id to skip auto-discovery.'
    );
  }

  if (!res.ok) {
    throw new Error(
      `Route 53 zone discovery failed for "${apexDomain}": ${res.error ?? 'unknown error'}.\n` +
        'If your domain uses a two-part TLD (e.g. .co.uk), pass --hosted-zone-id explicitly.'
    );
  }
  if (res.zones.length === 0) {
    throw new Error(
      `No public Route 53 hosted zone found for "${apexDomain}".\n` +
        'Ensure the zone exists in your AWS account and credentials have route53:ListHostedZonesByName permission.\n' +
        'If your domain uses a two-part TLD (e.g. .co.uk), pass --hosted-zone-id explicitly.'
    );
  }
  if (res.zones.length > 1) {
    const list = res.zones.map(z => `  ${z.id}  ${z.name}`).join('\n');
    throw new Error(
      `Multiple Route 53 hosted zones found for "${apexDomain}" — cannot auto-select:\n${list}\n` +
        'Pass --hosted-zone-id to specify which zone to use.'
    );
  }
  return res.zones[0].id;
}

function normalizeRecordName(name) {
  return String(name).trim().toLowerCase().replace(/\.+$/, '');
}

/**
 * Resend returns names relative to the sending subdomain (e.g. resend._domainkey.auth).
 * Route 53 needs an FQDN inside the apex zone (resend._domainkey.auth.beakerstack.com.).
 *
 * @param {string} recordName from Resend records[].name
 * @param {string} apexDomain e.g. beakerstack.com
 * @param {string} sendingDomain e.g. auth.beakerstack.com
 * @returns {string} FQDN with trailing dot for ChangeResourceRecordSets
 */
export function qualifyRecordNameForZone(
  recordName,
  apexDomain,
  sendingDomain
) {
  const apex = normalizeRecordName(apexDomain);
  const sending = normalizeRecordName(sendingDomain);
  const n = normalizeRecordName(recordName);
  if (!n) return `${apex}.`;

  if (n === apex || n.endsWith(`.${apex}`)) {
    return toRoute53Fqdn(n);
  }
  if (n === sending || n.endsWith(`.${sending}`)) {
    return toRoute53Fqdn(n);
  }

  // e.g. resend._domainkey.auth or send.auth → append apex
  const subLabel = sending.endsWith(`.${apex}`)
    ? sending.slice(0, -(apex.length + 1))
    : '';
  if (subLabel && (n === subLabel || n.endsWith(`.${subLabel}`))) {
    return toRoute53Fqdn(`${n}.${apex}`);
  }

  if (!n.endsWith(`.${apex}`) && !n.includes(sending)) {
    return toRoute53Fqdn(`${n}.${sending}`);
  }

  return toRoute53Fqdn(`${n}.${apex}`);
}

/** @param {string} name */
function toRoute53Fqdn(name) {
  const n = normalizeRecordName(name);
  return `${n}.`;
}

/** Route 53 requires a positive integer TTL; Resend often returns "Auto". */
const DEFAULT_ROUTE53_TTL = 300;

/**
 * @param {number | string | undefined} ttl from Resend records[]
 * @returns {number}
 */
export function resolveRoute53Ttl(ttl) {
  if (typeof ttl === 'number' && Number.isFinite(ttl) && ttl > 0) {
    return Math.trunc(ttl);
  }
  if (typeof ttl === 'string') {
    const t = ttl.trim().toLowerCase();
    if (t === 'auto' || t === '') return DEFAULT_ROUTE53_TTL;
    const n = Number.parseInt(t, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_ROUTE53_TTL;
}

function buildChanges(
  records,
  { sendingDomain, apexDomain, dmarc, dmarcEmail }
) {
  const changes = [];

  for (const rec of records) {
    const type = (rec.type ?? '').toUpperCase();
    const name = qualifyRecordNameForZone(
      rec.name ?? '',
      apexDomain,
      sendingDomain
    );
    const value = rec.value ?? '';
    const ttl = resolveRoute53Ttl(rec.ttl);

    if (type === 'TXT') {
      changes.push(
        upsertRecord(name, 'TXT', ttl, [{ Value: formatTxtValue(value) }])
      );
    } else if (type === 'CNAME') {
      changes.push(
        upsertRecord(name, 'CNAME', ttl, [{ Value: value.replace(/\.$/, '') }])
      );
    } else if (type === 'MX') {
      changes.push(upsertRecord(name, 'MX', ttl, [{ Value: value }]));
    } else if (type) {
      console.warn(
        `[setup:email-dns] Skipping unrecognized Resend record type "${rec.type}" for ${name}`
      );
    }
  }

  if (dmarc) {
    const rua = dmarcEmail ? `mailto:${dmarcEmail}` : '';
    const dmarcValue = `v=DMARC1; p=none${rua ? `; rua=${rua}` : ''}`;
    changes.push(
      upsertRecord(
        qualifyRecordNameForZone(
          `_dmarc.${sendingDomain}`,
          apexDomain,
          sendingDomain
        ),
        'TXT',
        300,
        [{ Value: formatTxtValue(dmarcValue) }]
      )
    );
  }

  return changes;
}

function upsertRecord(name, type, ttl, resourceRecords) {
  return {
    Action: 'UPSERT',
    ResourceRecordSet: {
      Name: name,
      Type: type,
      TTL: ttl,
      ResourceRecords: resourceRecords,
    },
  };
}

async function checkExistingSpf(zoneId, sendingDomain, awsProfileArgs) {
  // Skip if domain contains characters that would break the JMESPath query
  if (/['"\\]/.test(sendingDomain)) return;

  const result = spawnSync(
    'aws',
    [
      'route53',
      'list-resource-record-sets',
      '--hosted-zone-id',
      zoneId,
      '--query',
      `ResourceRecordSets[?Name=='${toRoute53Fqdn(sendingDomain)}' && Type=='TXT']`,
      ...awsProfileArgs,
    ],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) return;

  let existing;
  try {
    existing = JSON.parse(result.stdout);
  } catch {
    return;
  }
  if (!Array.isArray(existing) || existing.length === 0) return;

  const hasSpf = existing.some(rrs =>
    (rrs.ResourceRecords ?? []).some(r => r.Value?.includes('v=spf1'))
  );
  if (hasSpf) {
    console.warn(
      `\n⚠  Existing SPF TXT record found for ${sendingDomain}.\n` +
        "   The UPSERT will replace it with Resend's SPF record.\n" +
        '   If you send from multiple providers, merge SPF includes manually after setup.\n'
    );
  }
}
