/**
 * Stripe billing keys for setup-full (GitHub Actions + .env.cloud.generated.local).
 */

import {
  ensureStripeWebhook,
  isAutoEnsureStripeWebhookUrl,
  MissingWebhookSecretError,
  stripeSecretKeyMatchesMode,
} from './ensure-stripe-webhook.mjs';

/** @typedef {{ id: string; label: string; secretKey: string; webhookSecretKey: string; supabaseUrlKeys: string[]; stripeMode: 'test' | 'live' }} StripeSetupTier */

/** @type {StripeSetupTier[]} */
export const STRIPE_SETUP_TIERS = [
  {
    id: 'preview',
    label: 'Preview (PR testing)',
    secretKey: 'PREVIEW_STRIPE_SECRET_KEY',
    webhookSecretKey: 'PREVIEW_STRIPE_WEBHOOK_SECRET',
    supabaseUrlKeys: ['PREVIEW_SUPABASE_URL', 'PR_TESTING_SUPABASE_URL'],
    stripeMode: 'test',
  },
  {
    id: 'staging',
    label: 'Staging',
    secretKey: 'STAGING_STRIPE_SECRET_KEY',
    webhookSecretKey: 'STAGING_STRIPE_WEBHOOK_SECRET',
    supabaseUrlKeys: ['STAGING_SUPABASE_URL'],
    stripeMode: 'test',
  },
  {
    id: 'production',
    label: 'Production',
    secretKey: 'PRODUCTION_STRIPE_SECRET_KEY',
    webhookSecretKey: 'PRODUCTION_STRIPE_WEBHOOK_SECRET',
    supabaseUrlKeys: ['PRODUCTION_SUPABASE_URL'],
    stripeMode: 'live',
  },
];

/** Env flag: stripe keys may be omitted from GitHub required list and github-phase prompts. */
export const SETUP_STRIPE_SKIPPED_ENV = 'SETUP_STRIPE_SKIPPED';

/**
 * @param {{ name?: string }} def
 */
export function isStripeGithubSecretDef(def) {
  return /_STRIPE_/.test(String(def?.name || ''));
}

/**
 * @param {Record<string, string>} env
 */
export function setupStripeKeysDeferred(env) {
  return env[SETUP_STRIPE_SKIPPED_ENV] === 'true';
}

/**
 * @param {Record<string, string>} acc
 * @param {StripeSetupTier} tier
 */
export function resolveSupabaseUrlForStripeTier(acc, tier) {
  for (const key of tier.supabaseUrlKeys) {
    const v = (acc[key] || '').trim();
    if (v) return v;
  }
  return '';
}

/**
 * @param {string} supabaseUrl
 * @returns {string}
 */
export function supabaseStripeWebhookUrl(supabaseUrl) {
  const raw = String(supabaseUrl || '').trim();
  if (!raw) return '';
  const webhookPath = '/functions/v1/stripe-webhook';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    const hostMatch = u.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    if (hostMatch) {
      return `https://${hostMatch[1]}.supabase.co${webhookPath}`;
    }
    const path = u.pathname.replace(/\/+$/, '') || '';
    if (path.endsWith(webhookPath)) {
      return `${u.origin}${path}`;
    }
    if (path && path !== '/') {
      return `${u.origin}${path}${webhookPath}`;
    }
    return `${u.origin}${webhookPath}`;
  } catch {
    return '';
  }
}

/**
 * @param {Record<string, string>} acc
 * @param {StripeSetupTier} tier
 */
export function tierStripeKeysPresent(acc, tier) {
  return Boolean(
    (acc[tier.secretKey] || '').trim() &&
    (acc[tier.webhookSecretKey] || '').trim()
  );
}

/**
 * @param {StripeSetupTier} tier
 * @param {string} webhookUrl
 * @returns {string}
 */
export function stripeWebhookDescriptionForTier(tier, webhookUrl) {
  let ref = '';
  try {
    ref = new URL(webhookUrl).hostname.split('.')[0] || '';
  } catch {
    /* ignore */
  }
  const suffix = ref ? ` (${ref})` : '';
  return `BeakerStack ${tier.id}${suffix}`;
}

/**
 * @param {{
 *   acc: Record<string, string>;
 *   tier: StripeSetupTier;
 *   webhookUrl: string;
 *   logInfo: (s: string) => void;
 *   logWarn: (s: string) => void;
 *   applySecret: (raw: string, primaryKey: string) => Promise<void>;
 * }} ctx
 * @returns {Promise<boolean>} true if webhook secret is set when done
 */
export async function ensureTierStripeWebhookSecret(ctx) {
  const { acc, tier, webhookUrl, logInfo, logWarn, applySecret } = ctx;

  if ((acc[tier.webhookSecretKey] || '').trim()) {
    return true;
  }

  const secretKey = (acc[tier.secretKey] || '').trim();
  if (!secretKey) {
    return false;
  }

  if (!isAutoEnsureStripeWebhookUrl(webhookUrl)) {
    return false;
  }

  if (!stripeSecretKeyMatchesMode(secretKey, tier.stripeMode)) {
    logWarn(
      `  ${tier.secretKey} does not look like sk_${tier.stripeMode === 'live' ? 'live' : 'test'}_ — fix the key or Stripe mode before ensuring webhooks.`
    );
    return false;
  }

  try {
    const result = await ensureStripeWebhook({
      secretKey,
      webhookUrl,
      existingWebhookSecret: acc[tier.webhookSecretKey],
      description: stripeWebhookDescriptionForTier(tier, webhookUrl),
    });
    await applySecret(result.signingSecret, tier.webhookSecretKey);
    if (result.created) {
      logInfo(
        `  Created Stripe webhook endpoint ${result.endpointId} and saved ${tier.webhookSecretKey}.`
      );
    } else if (result.eventsUpdated) {
      logInfo(
        `  Updated webhook ${result.endpointId} events; reused ${tier.webhookSecretKey}.`
      );
    } else {
      logInfo(
        `  Reused existing Stripe webhook; saved ${tier.webhookSecretKey}.`
      );
    }
    return true;
  } catch (e) {
    if (e instanceof MissingWebhookSecretError) {
      logWarn(
        '  Stripe already has a webhook for this URL but the signing secret is unknown.'
      );
      logInfo(
        '  Dashboard → Developers → Webhooks → this endpoint → Reveal signing secret (whsec_…).'
      );
      return false;
    }
    logWarn(`  Could not ensure Stripe webhook: ${e.message}`);
    return false;
  }
}

/**
 * @param {{
 *   acc: Record<string, string>;
 *   flags: { dryRun: boolean; plainSecretPrompts: boolean };
 *   logInfo: (s: string) => void;
 *   logWarn: (s: string) => void;
 *   question: (prompt: string) => Promise<string>;
 *   readSecret: (prompt: string) => Promise<string>;
 *   applySecret: (raw: string, primaryKey: string) => Promise<void>;
 * }} ctx
 */
export async function collectStripeEnvKeys(ctx) {
  const { acc, flags, logInfo, logWarn, question, readSecret, applySecret } =
    ctx;

  if (flags.dryRun) {
    logInfo(
      '[dry-run] would walk preview / staging / production Stripe keys (sk_*; auto-ensure hosted webhooks when Supabase URL is set).'
    );
    for (const tier of STRIPE_SETUP_TIERS) {
      const supabaseUrl = resolveSupabaseUrlForStripeTier(acc, tier);
      const webhookUrl = supabaseStripeWebhookUrl(supabaseUrl);
      if (webhookUrl && isAutoEnsureStripeWebhookUrl(webhookUrl)) {
        logInfo(
          `[dry-run] would ensure Stripe webhook at ${webhookUrl} → ${tier.webhookSecretKey}`
        );
      }
    }
    return;
  }

  for (const tier of STRIPE_SETUP_TIERS) {
    if (tierStripeKeysPresent(acc, tier)) {
      logInfo(
        `${tier.label}: ${tier.secretKey} and ${tier.webhookSecretKey} already set (values not printed).`
      );
      continue;
    }

    const supabaseUrl = resolveSupabaseUrlForStripeTier(acc, tier);
    const webhookUrl = supabaseStripeWebhookUrl(supabaseUrl);
    const canAutoEnsure =
      Boolean(webhookUrl) && isAutoEnsureStripeWebhookUrl(webhookUrl);

    logInfo('');
    logInfo(`── Stripe: ${tier.label} ──`);
    logInfo(
      `  Use Stripe ${tier.stripeMode === 'live' ? 'Live' : 'Test'} mode keys (Dashboard toggle in header).`
    );
    if (webhookUrl) {
      logInfo(`  Webhook endpoint URL for this Supabase project:`);
      logInfo(`    ${webhookUrl}`);
      if (canAutoEnsure) {
        logInfo(
          `  With ${tier.secretKey} only, the wizard can create or update this webhook in Stripe and set ${tier.webhookSecretKey} automatically.`
        );
      } else {
        logInfo(
          '  Local/custom URLs: use Stripe CLI (stripe listen) for webhooks; see docs/stripe-billing-setup.md §8.'
        );
      }
    } else {
      logWarn(
        `  No Supabase URL set yet (${tier.supabaseUrlKeys.join(' / ')}) — complete supabase phase first, or paste keys from docs/stripe-billing-setup.md.`
      );
    }
    logInfo(
      `  Secret key → ${tier.secretKey}  |  Signing secret → ${tier.webhookSecretKey}`
    );
    logInfo(
      '  (Next prompt: Enter or y = collect this tier; n = skip — github may prompt again if still empty.)'
    );
    logInfo('');

    const skipTier = (
      await question(`Collect Stripe keys for ${tier.label} now? (Y/n): `)
    )
      .trim()
      .toLowerCase();
    if (skipTier === 'n' || skipTier === 'no') {
      logInfo(`Skipped ${tier.label} Stripe keys for now.`);
      continue;
    }

    if (!(acc[tier.secretKey] || '').trim()) {
      const sk = await readSecret(
        `${tier.secretKey} (sk_${tier.stripeMode === 'live' ? 'live' : 'test'}_…, Enter to skip): `
      );
      if (sk) await applySecret(sk, tier.secretKey);
    }

    if (webhookUrl && !(acc[tier.webhookSecretKey] || '').trim()) {
      const ensured = await ensureTierStripeWebhookSecret({
        acc,
        tier,
        webhookUrl,
        logInfo,
        logWarn,
        applySecret,
      });
      if (!ensured && !(acc[tier.webhookSecretKey] || '').trim()) {
        const wh = await readSecret(
          `${tier.webhookSecretKey} (whsec_… — paste from Dashboard Reveal if webhook already exists, Enter to skip): `
        );
        if (wh) await applySecret(wh, tier.webhookSecretKey);
      }
    } else if (!(acc[tier.webhookSecretKey] || '').trim()) {
      const wh = await readSecret(
        `${tier.webhookSecretKey} (whsec_… for webhook above, Enter to skip): `
      );
      if (wh) await applySecret(wh, tier.webhookSecretKey);
    }
  }

  logInfo('');
  logInfo(
    'Optional next steps (not run by this wizard): npm run billing:sync-stripe per project; supabase secrets set; see docs/stripe-billing-setup.md §7–8.'
  );
}
