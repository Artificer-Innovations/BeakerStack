#!/usr/bin/env node
/**
 * Idempotent Stripe product/price sync + updates public.billing_plans stripe price columns
 * (stripe_price_id_monthly, stripe_price_id_annual).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/sync-billing-stripe.mjs --config apps/web/src/billing/billing-sync.json
 *
 * Free plans are skipped (no Stripe price). Each paid plan should list `prices` with
 * one `interval: "month"` and one `interval: "year"`.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Stripe from 'stripe';
import WebSocket from 'ws';

function parseArgs(argv) {
  const out = { config: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) {
      out.config = argv[++i];
    }
  }
  return out;
}

async function ensurePrice(stripe, stripeProductId, productId, planId, def) {
  const { unitAmount, currency, interval, lookupKey } = def;
  const prices = await stripe.prices.list({
    product: stripeProductId,
    active: true,
    limit: 50,
  });
  const key = lookupKey || `${planId}_${interval}`;
  let price = prices.data.find(
    (x) => x.lookup_key === key || x.metadata?.billing_plan_cadence === key
  );
  if (!price) {
    price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: unitAmount,
      currency: currency || 'usd',
      recurring: { interval: interval || 'month' },
      lookup_key: key,
      metadata: {
        billing_plan_id: planId,
        billing_product_id: productId,
        billing_plan_cadence: key,
      },
    });
  }
  return price.id;
}

async function main() {
  const { config: configPath } = parseArgs(process.argv);
  const sk = process.env.STRIPE_SECRET_KEY;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk || !url || !serviceKey) {
    console.error('Missing STRIPE_SECRET_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!configPath) {
    console.error('Usage: node scripts/sync-billing-stripe.mjs --config <path-to-billing-sync.json>');
    process.exit(1);
  }

  const abs = path.resolve(process.cwd(), configPath);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const { productId, stripeProductName, plans } = raw;
  if (!productId || !Array.isArray(plans)) {
    console.error('Invalid config: need productId and plans[]');
    process.exit(1);
  }

  const stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
  const supabase = createClient(url, serviceKey, {
    realtime: {
      // Node.js < 22 has no global WebSocket; Realtime still initializes at client construction.
      transport: WebSocket,
    },
  });

  let stripeProductId;
  const existing = await stripe.products.list({ active: true, limit: 100 });
  const found = existing.data.find((p) => p.metadata?.billing_product_id === productId);
  if (found) {
    stripeProductId = found.id;
  } else {
    const p = await stripe.products.create({
      name: stripeProductName || productId,
      metadata: { billing_product_id: productId },
    });
    stripeProductId = p.id;
  }

  for (const plan of plans) {
    const { planId, unitAmount, currency, interval, prices: priceList } = plan;
    if (!planId) continue;

    /** @type {Array<{ unitAmount: number, currency?: string, interval: string, lookupKey?: string }>} */
    let prices = priceList;
    if (!prices && unitAmount != null) {
      prices = [
        { unitAmount, currency: currency || 'usd', interval: interval || 'month' },
      ];
    }
    if (!prices || prices.length === 0) {
      continue;
    }

    let monthlyId = null;
    let annualId = null;

    for (const pdef of prices) {
      if (!pdef || pdef.unitAmount == null) continue;
      const id = await ensurePrice(
        stripe,
        stripeProductId,
        productId,
        planId,
        pdef
      );
      if (pdef.interval === 'year') {
        annualId = id;
      } else {
        monthlyId = id;
      }
      console.log('Price', planId, pdef.interval, '→', id);
    }

    const { error } = await supabase
      .from('billing_plans')
      .update({
        stripe_price_id_monthly: monthlyId,
        stripe_price_id_annual: annualId,
        stripe_product_id: stripeProductId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('product_id', productId);
    if (error) {
      console.error('Supabase update failed', planId, error);
      process.exit(1);
    }
    console.log('Updated plan', planId, { monthlyId, annualId });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
