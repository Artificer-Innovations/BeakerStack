/**
 * Kit (ConvertKit Creator API v4) setup helpers for setup:kit and setup-full.
 */

import crypto from 'node:crypto';

import {
  ensureKitWebhook,
  kitWebhookUrlFromSupabaseUrl,
} from './ensure-kit-webhook.mjs';

export const KIT_ENV_KEYS = [
  'KIT_API_KEY',
  'KIT_CRON_SECRET',
  'KIT_WEBHOOK_SECRET',
];

/** Env flag: Kit keys may be omitted from GitHub required list and github-phase prompts. */
export const SETUP_KIT_SKIPPED_ENV = 'SETUP_KIT_SKIPPED';

/** Supabase URL env keys checked for webhook auto-provisioning. */
export const KIT_WEBHOOK_TIER_URL_KEYS = [
  {
    label: 'Preview',
    keys: ['PREVIEW_SUPABASE_URL', 'PR_TESTING_SUPABASE_URL'],
  },
  { label: 'Staging', keys: ['STAGING_SUPABASE_URL'] },
  { label: 'Production', keys: ['PRODUCTION_SUPABASE_URL'] },
];

/**
 * @param {{ name?: string }} def
 */
export function isKitGithubSecretDef(def) {
  return (
    def?.name === 'KIT_API_KEY' ||
    def?.name === 'KIT_CRON_SECRET' ||
    def?.name === 'KIT_WEBHOOK_SECRET'
  );
}

/**
 * @param {Record<string, string>} env
 */
export function setupKitKeysDeferred(env) {
  return env[SETUP_KIT_SKIPPED_ENV] === 'true';
}

/**
 * @param {Record<string, string>} acc
 */
export function hasKitCredentials(acc) {
  const apiKey = String(acc.KIT_API_KEY ?? '').trim();
  const webhookSecret = String(acc.KIT_WEBHOOK_SECRET ?? '').trim();
  return Boolean(apiKey && webhookSecret);
}

/**
 * @param {(s: string) => void} [log]
 */
export function printKitSetupGuidance(log = console.log) {
  log('');
  log('Kit (ConvertKit Creator API v4) marketing email:');
  log('  • Create a V4 API key: Kit → Settings → Developer');
  log(
    '  • Create a form or sequence; note the form ID for Admin → Marketing Email Settings'
  );
  log(
    '  • Pre-create tags in Kit before sync (sync fails with kit_tag_not_found otherwise):'
  );
  log(
    '      {namespace}:signup, :waitlist, :waitlist-approved, :converted, :churned'
  );
  log(
    '      {namespace}:tier:{tier} and {namespace}:interest:{tier} for each tier slug'
  );
  log(
    '  • Webhook signing secret: Kit dashboard → Webhooks → Signing secret (account-level)'
  );
  log('  • Per environment: enable sync at /admin/marketing-email/settings');
  log(
    '    (namespace, kitFormId, tierTagNames can differ per preview/staging/production)'
  );
  log('');
}

/**
 * @param {Record<string, string>} acc
 * @param {string[]} keys
 * @returns {string}
 */
export function resolveFirstEnvKey(acc, keys) {
  for (const key of keys) {
    const v = String(acc[key] ?? '').trim();
    if (v) return v;
  }
  return '';
}

/**
 * @param {Record<string, string>} acc
 * @returns {{ label: string; supabaseUrl: string; webhookUrl: string }[]}
 */
export function listKitWebhookTargets(acc) {
  /** @type {{ label: string; supabaseUrl: string; webhookUrl: string }[]} */
  const out = [];
  for (const tier of KIT_WEBHOOK_TIER_URL_KEYS) {
    const supabaseUrl = resolveFirstEnvKey(acc, tier.keys);
    if (!supabaseUrl) continue;
    const webhookUrl = kitWebhookUrlFromSupabaseUrl(supabaseUrl);
    if (!webhookUrl) continue;
    out.push({ label: tier.label, supabaseUrl, webhookUrl });
  }
  return out;
}

/**
 * @param {Record<string, string>} acc
 * @param {{ dryRun?: boolean; logInfo?: (m: string) => void; logWarn?: (m: string) => void }} opts
 */
export async function ensureKitWebhooksForTiers(acc, opts = {}) {
  const { dryRun = false, logInfo = () => {}, logWarn = () => {} } = opts;
  const apiKey = String(acc.KIT_API_KEY ?? '').trim();
  if (!apiKey) {
    logWarn('No KIT_API_KEY — skipping Kit webhook auto-provisioning.');
    return;
  }

  const targets = listKitWebhookTargets(acc);
  if (targets.length === 0) {
    logWarn(
      'No Supabase URLs in env — skipping Kit webhook auto-provisioning (set PREVIEW_/STAGING_/PRODUCTION_SUPABASE_URL).'
    );
    return;
  }

  for (const t of targets) {
    if (dryRun) {
      logInfo(
        `[dry-run] would ensure Kit webhook for ${t.label}: ${t.webhookUrl}`
      );
      continue;
    }
    try {
      const result = await ensureKitWebhook({
        apiKey,
        webhookUrl: t.webhookUrl,
        description: `BeakerStack ${t.label.toLowerCase()}`,
      });
      if (result.created) {
        logInfo(`Created Kit webhook for ${t.label} → ${t.webhookUrl}`);
      } else {
        logInfo(
          `Kit webhook already configured for ${t.label} → ${t.webhookUrl}`
        );
      }
    } catch (e) {
      logWarn(
        `Kit webhook ensure failed for ${t.label}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

/**
 * @param {Record<string, string>} acc
 * @param {{ dryRun?: boolean; yes?: boolean; logInfo?: (m: string) => void; logWarn?: (m: string) => void; question?: (q: string) => Promise<string>; readSecret?: (q: string) => Promise<string> }} opts
 */
export async function collectKitEnvKeys(acc, opts = {}) {
  const {
    dryRun = false,
    yes = false,
    logInfo = () => {},
    logWarn = () => {},
    question = async () => '',
    readSecret = async () => '',
  } = opts;

  if (hasKitCredentials(acc)) {
    logInfo(
      'Kit credentials already present in session env (values not shown).'
    );
    if (!acc.KIT_CRON_SECRET?.trim()) {
      acc.KIT_CRON_SECRET = crypto.randomBytes(32).toString('hex');
      logInfo('Generated KIT_CRON_SECRET (value not printed).');
    }
    await ensureKitWebhooksForTiers(acc, { dryRun, logInfo, logWarn });
    return;
  }

  if (!yes) {
    printKitSetupGuidance(logInfo);
    const skip = (
      await question(
        'Configure Kit marketing email now? (Y)es / (N)o skip [Y]: '
      )
    )
      .trim()
      .toLowerCase();
    if (skip === 'n' || skip === 'no') {
      logWarn(
        'Skipped Kit setup — marketing email sync will not work until KIT_* secrets are configured.'
      );
      return;
    }
  }

  if (dryRun) {
    logInfo('[dry-run] would prompt for KIT_* secrets (skipped).');
    return;
  }

  const apiKeyRaw = yes
    ? String(acc.KIT_API_KEY ?? '').trim()
    : await readSecret('Kit Creator API v4 key (KIT_API_KEY): ');
  const apiKey = apiKeyRaw.trim() || String(acc.KIT_API_KEY ?? '').trim();
  if (!apiKey) {
    logWarn('No API key entered — skipping Kit setup.');
    return;
  }
  acc.KIT_API_KEY = apiKey;

  const cronRaw = yes
    ? String(acc.KIT_CRON_SECRET ?? '').trim()
    : await readSecret(
        'Kit cron secret (KIT_CRON_SECRET) [Enter to auto-generate]: '
      );
  acc.KIT_CRON_SECRET =
    cronRaw.trim() ||
    String(acc.KIT_CRON_SECRET ?? '').trim() ||
    crypto.randomBytes(32).toString('hex');
  logInfo('Stored KIT_CRON_SECRET (value not printed).');

  const webhookSecretRaw = yes
    ? String(acc.KIT_WEBHOOK_SECRET ?? '').trim()
    : await readSecret(
        'Kit webhook signing secret (KIT_WEBHOOK_SECRET, from Kit dashboard): '
      );
  const webhookSecret =
    webhookSecretRaw.trim() || String(acc.KIT_WEBHOOK_SECRET ?? '').trim();
  if (!webhookSecret) {
    logWarn(
      'No webhook signing secret entered — inbound Kit unsubscribes will not verify until KIT_WEBHOOK_SECRET is set.'
    );
    delete acc.KIT_API_KEY;
    delete acc.KIT_CRON_SECRET;
    return;
  }
  acc.KIT_WEBHOOK_SECRET = webhookSecret;
  logInfo('Stored Kit credentials (values not printed).');

  await ensureKitWebhooksForTiers(acc, { dryRun, logInfo, logWarn });
}
