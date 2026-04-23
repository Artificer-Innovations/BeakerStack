/**
 * Read-only AWS discovery for setup-full PR preview bootstrap:
 * public Route53 hosted zone for an apex domain, ACM (us-east-1) cert covering apex + wildcard.
 */

import { runCmd } from './setup-supabase.mjs';

/** CloudFront ACM must be in us-east-1. */
export const ACM_CLOUDFRONT_REGION = 'us-east-1';

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeApexDomain(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, '');
}

/**
 * @param {string} id Route53 HostedZone.Id (often "/hostedzone/Z…")
 * @returns {string}
 */
export function route53ResourceIdToZoneId(id) {
  const s = String(id);
  const prefix = '/hostedzone/';
  if (s.startsWith(prefix)) return s.slice(prefix.length);
  return s;
}

/**
 * @param {string} name
 */
function normalizeDnsName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, '');
}

/**
 * @param {string} domainName
 * @param {string[] | undefined} sanSummaries
 * @returns {Set<string>}
 */
export function dnsNameSetFromCertSummary(domainName, sanSummaries) {
  /** @type {Set<string>} */
  const set = new Set();
  const add = (n) => {
    const x = normalizeDnsName(n);
    if (x) set.add(x);
  };
  add(domainName);
  if (Array.isArray(sanSummaries)) {
    for (const s of sanSummaries) add(s);
  }
  return set;
}

/**
 * @param {string} apex
 * @param {Set<string>} nameSet normalized DNS names (no trailing dots)
 */
export function certNameSetCoversApexAndWildcard(apex, nameSet) {
  const a = normalizeApexDomain(apex);
  const needWild = `*.${a}`;
  return nameSet.has(a) && nameSet.has(needWild);
}

/**
 * @param {string} apex
 * @param {{ DomainName?: string; SubjectAlternativeNameSummaries?: string[] }} summary
 */
export function certSummaryDefinitelyCovers(apex, summary) {
  const set = dnsNameSetFromCertSummary(summary.DomainName || '', summary.SubjectAlternativeNameSummaries);
  return certNameSetCoversApexAndWildcard(apex, set);
}

/**
 * Whether describe-certificate might reveal apex + wildcard coverage not visible in list output.
 * @param {string} apex
 * @param {{ DomainName?: string; SubjectAlternativeNameSummaries?: string[] }} summary
 */
export function certSummaryNeedsDescribe(apex, summary) {
  if (certSummaryDefinitelyCovers(apex, summary)) return false;
  const a = normalizeApexDomain(apex);
  const wild = `*.${a}`;
  const dn = normalizeDnsName(summary.DomainName || '');
  if (dn === a || dn === wild) return true;
  const set = dnsNameSetFromCertSummary(summary.DomainName || '', summary.SubjectAlternativeNameSummaries);
  if (set.has(a) || set.has(wild)) return true;
  return false;
}

/**
 * @param {string} apex
 * @param {{ SubjectAlternativeNames?: string[]; DomainName?: string }} detail Certificate detail from describe-certificate
 */
export function certDetailCoversApexAndWildcard(apex, detail) {
  const sans = detail.SubjectAlternativeNames || [];
  const set = dnsNameSetFromCertSummary(detail.DomainName || '', sans);
  return certNameSetCoversApexAndWildcard(apex, set);
}

/**
 * @param {string[]} awsProfileArgs
 */
function awsBase(awsProfileArgs) {
  return ['aws', ...awsProfileArgs];
}

/**
 * @param {string} apexDomain raw or normalized apex (e.g. example.com)
 * @param {string[]} awsProfileArgs
 * @returns {Promise<{ ok: boolean; error?: string; zones: { id: string; name: string }[] }>}
 */
export async function discoverRoute53PublicZonesForApex(apexDomain, awsProfileArgs) {
  const apex = normalizeApexDomain(apexDomain);
  if (!apex) {
    return { ok: false, error: 'Empty apex domain', zones: [] };
  }
  const dnsArg = `${apex}.`;
  const args = [
    ...awsBase(awsProfileArgs),
    'route53',
    'list-hosted-zones-by-name',
    '--dns-name',
    dnsArg,
    '--output',
    'json',
  ];
  const res = await runCmd(args[0], args.slice(1));
  if (res.code !== 0) {
    return {
      ok: false,
      error: (res.stderr || res.stdout || 'list-hosted-zones-by-name failed').trim(),
      zones: [],
    };
  }
  let data;
  try {
    data = JSON.parse(res.stdout);
  } catch {
    return { ok: false, error: 'Invalid JSON from list-hosted-zones-by-name', zones: [] };
  }
  const list = Array.isArray(data.HostedZones) ? data.HostedZones : [];
  const wantName = `${apex}.`;
  /** @type { { id: string; name: string }[] } */
  const zones = [];
  for (const z of list) {
    const name = typeof z.Name === 'string' ? z.Name : '';
    if (normalizeDnsName(name) !== apex) continue;
    const cfg = z.Config && typeof z.Config === 'object' ? z.Config : {};
    if (cfg.PrivateZone === true) continue;
    const id = route53ResourceIdToZoneId(String(z.Id || ''));
    if (id) zones.push({ id, name: name || `${apex}.` });
  }
  return { ok: true, zones };
}

/**
 * @param {string} certificateArn
 * @param {string[]} awsProfileArgs
 */
async function describeCertificate(certificateArn, awsProfileArgs) {
  const args = [
    ...awsBase(awsProfileArgs),
    'acm',
    'describe-certificate',
    '--region',
    ACM_CLOUDFRONT_REGION,
    '--certificate-arn',
    certificateArn,
    '--output',
    'json',
  ];
  const res = await runCmd(args[0], args.slice(1));
  if (res.code !== 0) return null;
  try {
    const data = JSON.parse(res.stdout);
    return data.Certificate && typeof data.Certificate === 'object' ? data.Certificate : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} apexDomain
 * @param {string[]} awsProfileArgs
 * @returns {Promise<{ ok: boolean; error?: string; matches: { arn: string; domainName: string }[] }>}
 */
export async function discoverIssuedCertsCoveringApexWildcard(apexDomain, awsProfileArgs) {
  const apex = normalizeApexDomain(apexDomain);
  if (!apex) {
    return { ok: false, error: 'Empty apex domain', matches: [] };
  }

  /** @type {{ CertificateArn: string; DomainName: string; SubjectAlternativeNameSummaries?: string[] }[]} */
  const summaries = [];
  let nextToken = '';

  for (;;) {
    const args = [
      ...awsBase(awsProfileArgs),
      'acm',
      'list-certificates',
      '--region',
      ACM_CLOUDFRONT_REGION,
      '--certificate-statuses',
      'ISSUED',
      '--output',
      'json',
    ];
    if (nextToken) {
      args.push('--next-token', nextToken);
    }
    const res = await runCmd(args[0], args.slice(1));
    if (res.code !== 0) {
      return {
        ok: false,
        error: (res.stderr || res.stdout || 'list-certificates failed').trim(),
        matches: [],
      };
    }
    let data;
    try {
      data = JSON.parse(res.stdout);
    } catch {
      return { ok: false, error: 'Invalid JSON from list-certificates', matches: [] };
    }
    const page = Array.isArray(data.CertificateSummaryList) ? data.CertificateSummaryList : [];
    for (const row of page) {
      if (row && typeof row.CertificateArn === 'string' && typeof row.DomainName === 'string') {
        summaries.push({
          CertificateArn: row.CertificateArn,
          DomainName: row.DomainName,
          SubjectAlternativeNameSummaries: Array.isArray(row.SubjectAlternativeNameSummaries)
            ? row.SubjectAlternativeNameSummaries
            : undefined,
        });
      }
    }
    if (data.NextToken) {
      nextToken = data.NextToken;
    } else {
      break;
    }
  }

  /** @type {Map<string, { arn: string; domainName: string }>} */
  const byArn = new Map();

  for (const s of summaries) {
    if (certSummaryDefinitelyCovers(apex, s)) {
      byArn.set(s.CertificateArn, { arn: s.CertificateArn, domainName: s.DomainName });
      continue;
    }
    if (certSummaryNeedsDescribe(apex, s)) {
      const detail = await describeCertificate(s.CertificateArn, awsProfileArgs);
      if (detail && certDetailCoversApexAndWildcard(apex, detail)) {
        byArn.set(s.CertificateArn, { arn: s.CertificateArn, domainName: s.DomainName });
      }
    }
  }

  return { ok: true, matches: [...byArn.values()] };
}
