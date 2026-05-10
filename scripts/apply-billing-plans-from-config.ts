/* eslint-disable no-console -- CLI */
/**
 * Push plan catalog from app billing config → public.billing_plans (features, usage_limits,
 * display metadata). Does not touch Stripe price columns.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run billing:apply-plans
 *   npm run billing:apply-plans -- --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import type { ProductBillingConfig } from '@beakerstack/billing';

function parseArgs(argv: string[]) {
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
  }
  return { dryRun };
}

async function loadBillingConfig(spec: string): Promise<ProductBillingConfig> {
  const resolved = path.resolve(process.cwd(), spec);
  const href = pathToFileURL(resolved).href;
  const mod = await import(href);
  const c =
    (mod as { beakerstackBillingConfig?: ProductBillingConfig })
      .beakerstackBillingConfig ??
    (mod as { default?: ProductBillingConfig }).default;
  if (!c?.productId || !Array.isArray(c.plans)) {
    throw new Error(
      `Module ${spec} must export beakerstackBillingConfig (or default) with productId and plans[]`
    );
  }
  return c;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const configPath =
    process.env.BILLING_PLAN_CONFIG_MODULE ??
    'apps/web/src/billing/beakerstackBillingConfig.ts';
  const config = await loadBillingConfig(configPath);
  const productId = config.productId;

  if (!dryRun && (!url || !serviceKey)) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (service role required unless --dry-run)'
    );
    process.exit(1);
  }

  const supabase =
    url && serviceKey
      ? createClient(url, serviceKey, {
          realtime: {
            transport: WebSocket,
          },
        })
      : null;

  for (const plan of config.plans) {
    const payload = {
      display_name: plan.displayName,
      description: plan.description ?? null,
      price_cents: plan.priceCents,
      billing_period: plan.billingPeriod,
      features: plan.features as Record<string, boolean | number>,
      usage_limits: plan.usageLimits as Record<string, number>,
      trial_period_days: plan.trialPeriodDays ?? 0,
      is_public: plan.isPublic ?? true,
      display_order: plan.displayOrder ?? 0,
    };

    if (dryRun) {
      console.log(`[dry-run] ${plan.id}:`, JSON.stringify(payload, null, 2));
      continue;
    }

    if (!supabase) {
      console.error('Internal error: supabase client missing');
      process.exit(1);
    }

    const { data: existing, error: selErr } = await supabase
      .from('billing_plans')
      .select('id')
      .eq('id', plan.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (selErr) {
      console.error(`Select failed for ${plan.id}:`, selErr.message);
      process.exit(1);
    }
    if (!existing) {
      console.error(
        `No billing_plans row for id=${plan.id} product_id=${productId}. Create plans via migrations/seed before applying.`
      );
      process.exit(1);
    }

    const { error: upErr } = await supabase
      .from('billing_plans')
      .update(payload)
      .eq('id', plan.id)
      .eq('product_id', productId);

    if (upErr) {
      console.error(`Update failed for ${plan.id}:`, upErr.message);
      process.exit(1);
    }
    console.log(`Updated billing_plans ${plan.id}`);
  }

  if (dryRun) {
    console.log('Dry run complete; no writes performed.');
  } else {
    console.log(
      `Applied ${config.plans.length} plan(s) for product ${productId}.`
    );
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
