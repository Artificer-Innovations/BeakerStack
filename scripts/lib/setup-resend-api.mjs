/**
 * Resend domain lifecycle: create-or-reuse, disable tracking, fetch DNS records, verify + poll.
 * Reads RESEND_API_KEY from process.env — never accepts it as a parameter.
 */

const RESEND_BASE = 'https://api.resend.com';

/**
 * Create or reuse a Resend sending domain, disable tracking, and return DNS records.
 * Does NOT trigger verification — call verifyResendDomain() after DNS records are in Route 53.
 *
 * @param {string} sendingDomain e.g. "auth.myapp.com"
 * @param {{ dryRun?: boolean }} opts
 * @returns {Promise<{ domainId: string; records: ResendRecord[] }>}
 */
export async function createOrGetResendDomain(sendingDomain, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] would create/reuse Resend domain: ${sendingDomain}`);
    console.log('[dry-run] would disable click_tracking and open_tracking');
    return { domainId: 'dry-run', records: [] };
  }

  const apiKey = requireApiKey();
  let domain = await _createOrGetDomain(sendingDomain, apiKey);

  if (domain.click_tracking || domain.open_tracking) {
    await _patchDomain(domain.id, apiKey, { click_tracking: false, open_tracking: false });
    domain = await _getDomain(domain.id, apiKey);
  }

  return { domainId: domain.id, records: domain.records ?? [] };
}

/**
 * Trigger Resend domain verification and poll until verified or the user aborts.
 * Should be called AFTER DNS records have been written to Route 53.
 *
 * @param {string} domainId
 * @param {{ dryRun?: boolean; nonInteractive?: boolean }} opts
 *   nonInteractive: skip polling entirely (--yes / setup-full non-interactive); print pending message instead.
 * @returns {Promise<{ verified: boolean }>}
 */
export async function verifyResendDomain(domainId, { dryRun = false, nonInteractive = false } = {}) {
  if (dryRun) {
    console.log('[dry-run] would POST /verify and poll for verification');
    return { verified: false };
  }

  const apiKey = requireApiKey();
  await _verifyDomain(domainId, apiKey);

  if (nonInteractive) {
    console.log(
      '  Verification triggered. DNS propagation takes 10–60+ minutes.\n' +
        '  Re-run `node scripts/setup-email-dns.mjs` to check verification status.'
    );
    return { verified: false };
  }

  return _pollVerification(domainId, apiKey);
}

// --- internals ---

function requireApiKey() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set in the environment.');
  if (!apiKey.startsWith('re_')) {
    console.warn('⚠  RESEND_API_KEY does not start with "re_" — verify the key is correct.');
  }
  return apiKey;
}

async function resendFetch(path, apiKey, opts = {}) {
  const res = await fetch(`${RESEND_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Resend ${opts.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function _createOrGetDomain(name, apiKey) {
  try {
    return await resendFetch('/domains', apiKey, {
      method: 'POST',
      body: JSON.stringify({ name, click_tracking: false, open_tracking: false }),
    });
  } catch (err) {
    if (err.status === 409) {
      // Paginate through all pages to find the existing domain
      let cursor;
      do {
        const url = cursor ? `/domains?cursor=${encodeURIComponent(cursor)}` : '/domains';
        const list = await resendFetch(url, apiKey);
        const data = list.data ?? list;
        const existing = Array.isArray(data) ? data.find(d => d.name === name) : undefined;
        if (existing) return _getDomain(existing.id, apiKey);
        cursor = list.has_more ? list.next : null;
      } while (cursor);
      throw new Error(
        `Resend domain "${name}" already exists (409) but was not found in any page of the domain list. ` +
          'Check your Resend account or use a different API key.'
      );
    }
    throw err;
  }
}

async function _getDomain(id, apiKey) {
  return resendFetch(`/domains/${id}`, apiKey);
}

async function _patchDomain(id, apiKey, updates) {
  return resendFetch(`/domains/${id}`, apiKey, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

async function _verifyDomain(id, apiKey) {
  return resendFetch(`/domains/${id}/verify`, apiKey, { method: 'POST', body: '{}' });
}

async function _pollVerification(domainId, apiKey) {
  const backoffSecs = [5, 15, 30, 60];
  let attempt = 0;
  let elapsedSec = 0;
  let siginted = false;

  const sigintHandler = () => { siginted = true; };
  process.once('SIGINT', sigintHandler);

  process.stdout.write(
    '  Waiting for Resend domain verification (Ctrl-C to stop waiting and continue setup)…\n'
  );

  try {
    for (;;) {
      // Check status before sleeping — handles re-runs on already-verified domains immediately
      if (siginted) {
        process.stdout.write(
          '\n  Verification pending — re-run `node scripts/setup-email-dns.mjs` to check status.\n'
        );
        return { verified: false };
      }

      const domain = await _getDomain(domainId, apiKey);
      if (domain.status === 'verified') {
        return { verified: true };
      }

      const delaySec = backoffSecs[Math.min(attempt, backoffSecs.length - 1)];
      process.stdout.write(
        attempt === 0
          ? `  Pending — checking again in ${delaySec}s…\n`
          : `  Still pending (${elapsedSec}s elapsed) — checking again in ${delaySec}s…\n`
      );
      await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
      elapsedSec += delaySec;
      attempt++;
    }
  } finally {
    process.removeListener('SIGINT', sigintHandler);
  }
}

/**
 * @typedef {{ type: string; name: string; value: string; ttl?: number }} ResendRecord
 */
