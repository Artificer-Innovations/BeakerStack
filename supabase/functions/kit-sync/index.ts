// Worker: dequeues marketing_email_sync_queue rows and calls Kit Creator API v4.
// Scheduled every 5 min via pg_cron + pg_net (see kit_sync_cron migration).
// Auth: Bearer token matching KIT_CRON_SECRET env var.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  KitClient,
  KitClientError,
  isPermanentKitError,
  isRateLimitError,
  waitlistTag,
  waitlistApprovedTag,
  convertedTag,
  signupTag,
  tierTag,
  churnedTag,
  interestTag,
} from '../_shared/kitClient.ts';

const BATCH_SIZE = parseInt(Deno.env.get('KIT_SYNC_BATCH_SIZE') ?? '10', 10);
const KIT_CRON_SECRET = Deno.env.get('KIT_CRON_SECRET') ?? '';
const KIT_API_KEY = Deno.env.get('KIT_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface QueueRow {
  id: number;
  product_id: string;
  event_type: string;
  email: string;
  payload: Record<string, unknown>;
  attempts: number;
  status: string;
}

interface SettingsConfig {
  namespace: string;
  kitFormId?: string;
  tierTagNames?: string[];
  onChurn?: 'tag_only' | 'unsubscribe';
  tagScheme?: { separator?: string; tierPrefix?: string };
}

interface SettingsRow {
  enabled: boolean;
  config: SettingsConfig;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!KIT_CRON_SECRET || authHeader !== `Bearer ${KIT_CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'bulk-sync') {
    return handleBulkSync(admin);
  }

  return handleWorker(admin);
});

async function handleWorker(
  admin: ReturnType<typeof createClient>
): Promise<Response> {
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  const { data: rows, error: deqErr } = await admin.rpc('kit_sync_dequeue', {
    batch_size: BATCH_SIZE,
  });
  if (deqErr) {
    return Response.json({ error: deqErr.message }, { status: 500 });
  }

  const kit = new KitClient(KIT_API_KEY);
  // Cache settings per product_id; null = no row exists for this product.
  const settingsCache = new Map<string, SettingsRow | null>();

  for (const row of (rows as QueueRow[]) ?? []) {
    try {
      // Cache settings per product_id to avoid repeated lookups within a batch.
      if (!settingsCache.has(row.product_id)) {
        const { data } = await admin
          .from('marketing_email_settings')
          .select('enabled, config')
          .eq('product_id', row.product_id)
          .maybeSingle();
        settingsCache.set(row.product_id, (data as SettingsRow) ?? null);
      }
      const settings = settingsCache.get(row.product_id) ?? null;

      if (!settings) {
        // No marketing config for this product — drop the event.
        await markDone(admin, row.id);
        skipped++;
        continue;
      }

      if (!settings.enabled) {
        // Config exists but disabled — keep pending so it's processed if re-enabled.
        const { error: resetErr } = await admin
          .from('marketing_email_sync_queue')
          .update({ status: 'pending' })
          .eq('id', row.id);
        if (resetErr)
          console.error(
            'Failed to reset disabled-product row',
            row.id,
            resetErr.message
          );
        skipped++;
        continue;
      }

      const config = settings.config;

      // Guard: namespace is required for all Kit tag operations. Dead-letter with a
      // clear message so the operator knows exactly what to fix, rather than letting
      // the row reach Kit API and fail with a confusing tag-not-found error.
      if (!config.namespace) {
        const { error: upErr } = await admin
          .from('marketing_email_sync_queue')
          .update({
            status: 'failed',
            error: `marketing_email_settings.config missing required field "namespace" for product "${row.product_id}" — insert or update the row in marketing_email_settings with a non-empty namespace`,
          })
          .eq('id', row.id);
        if (upErr)
          console.error(
            'Failed to dead-letter config-invalid row',
            row.id,
            upErr.message
          );
        failed++;
        continue;
      }

      // Suppression check
      const { data: suppressed } = await admin
        .from('marketing_email_unsubscribes')
        .select('id')
        .eq('product_id', row.product_id)
        .eq('email', row.email)
        .maybeSingle();

      if (suppressed) {
        await markDone(admin, row.id);
        skipped++;
        continue;
      }

      await processEvent(kit, row, config);
      await markDone(admin, row.id);
      processed++;
    } catch (err) {
      failed++;
      const code = err instanceof KitClientError ? err.code : 'unknown';

      if (isRateLimitError(code)) {
        // 429 — rate limited; reset to pending without burning an attempt.
        const { error: updateErr } = await admin
          .from('marketing_email_sync_queue')
          .update({
            status: 'pending',
            last_attempted_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        if (updateErr)
          console.error(
            'Failed to reset rate-limited row',
            row.id,
            updateErr.message
          );
        continue;
      }

      const newAttempts = row.attempts + 1;
      const deadLetter = isPermanentKitError(code) || newAttempts >= 5;

      const { error: updateErr } = await admin
        .from('marketing_email_sync_queue')
        .update({
          status: deadLetter ? 'failed' : 'pending',
          attempts: newAttempts,
          last_attempted_at: new Date().toISOString(),
          error: (err instanceof Error ? err.message : String(err)).slice(
            0,
            500
          ),
        })
        .eq('id', row.id);
      if (updateErr)
        console.error(
          'Failed to update error status for row',
          row.id,
          updateErr.message
        );
    }
  }

  return Response.json({ processed, skipped, failed });
}

// Maps Stripe/billing plan_id to a tag slug.
// Stripe plan IDs often carry a product prefix (e.g. "bhg_pro"); strip the
// prefix when a matching slug exists in tierTagNames (e.g. "pro").
function planIdToSlug(planId: string, tierTagNames: string[]): string {
  if (tierTagNames.includes(planId)) return planId;
  const suffix = planId.split('_').pop() ?? planId;
  if (tierTagNames.includes(suffix)) return suffix;
  return planId;
}

async function processEvent(
  kit: KitClient,
  row: QueueRow,
  config: SettingsConfig
): Promise<void> {
  const { email, event_type, payload } = row;
  const ns = config.namespace;
  const opts = config.tagScheme;
  const formId = config.kitFormId;
  const tierTagNames = config.tierTagNames ?? [];

  switch (event_type) {
    case 'user.signed_up': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, signupTag(ns, opts));
      const rawPlanId =
        typeof payload.plan_id === 'string' && payload.plan_id
          ? payload.plan_id
          : undefined;
      if (rawPlanId) {
        const slug = planIdToSlug(rawPlanId, tierTagNames);
        await kit.applyTag(email, interestTag(ns, slug, opts));
      }
      break;
    }
    case 'waitlist.joined': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, waitlistTag(ns, opts));
      const rawPlanId =
        typeof payload.plan_id === 'string' && payload.plan_id
          ? payload.plan_id
          : undefined;
      if (rawPlanId) {
        const slug = planIdToSlug(rawPlanId, tierTagNames);
        await kit.applyTag(email, interestTag(ns, slug, opts));
      }
      break;
    }
    case 'waitlist.approved': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, waitlistApprovedTag(ns, opts));
      const rawPlanId =
        typeof payload.plan_id === 'string' && payload.plan_id
          ? payload.plan_id
          : undefined;
      if (rawPlanId) {
        const slug = planIdToSlug(rawPlanId, tierTagNames);
        await kit.applyTag(email, interestTag(ns, slug, opts));
      }
      break;
    }
    case 'waitlist.converted': {
      await kit.removeTag(email, waitlistTag(ns, opts));
      await kit.applyTag(email, convertedTag(ns, opts));
      break;
    }
    case 'user.tier_changed': {
      // stripe-webhook enqueues with { user_id, plan_id, status }.
      if (tierTagNames.length === 0)
        throw new KitClientError(
          `user.tier_changed requires tierTagNames in marketing_email_settings.config for product "${row.product_id}" — add tier slugs (e.g. ["pro","max"]) to config`,
          'kit_api_400'
        );
      const rawPlanId =
        typeof payload.plan_id === 'string' && payload.plan_id
          ? payload.plan_id
          : undefined;
      if (!rawPlanId)
        throw new KitClientError(
          'user.tier_changed payload missing plan_id',
          'kit_api_400'
        );
      const slug = planIdToSlug(rawPlanId, tierTagNames);
      for (const t of tierTagNames) {
        await kit.removeTag(email, tierTag(ns, t, opts));
      }
      await kit.applyTag(email, tierTag(ns, slug, opts));
      break;
    }
    case 'user.churned': {
      for (const t of tierTagNames) {
        await kit.removeTag(email, tierTag(ns, t, opts));
      }
      await kit.applyTag(email, churnedTag(ns, opts));
      if ((config.onChurn ?? 'tag_only') === 'unsubscribe') {
        await kit.unsubscribeUser(email);
      }
      break;
    }
    default:
      // Unknown events will never succeed — dead-letter immediately via
      // unknown_event_type being in PERMANENT_ERROR_CODES.
      throw new KitClientError(
        `Unknown event_type: ${event_type}`,
        'unknown_event_type'
      );
  }
}

async function markDone(
  admin: ReturnType<typeof createClient>,
  id: number
): Promise<void> {
  const { error } = await admin
    .from('marketing_email_sync_queue')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      error: null,
    })
    .eq('id', id);
  if (error) console.error('Failed to mark row done', id, error.message);
}

// Enqueues user.signed_up for all auth.users and waitlist.joined for all
// waitlist_entries where settings are enabled, using idempotency keys so
// re-runs are safe. Processes one product_id at a time.
//
// Note: does not backfill user.tier_changed from billing_subscriptions —
// that is deferred to Phase 5 admin backfill UI.
async function handleBulkSync(
  admin: ReturnType<typeof createClient>
): Promise<Response> {
  const { data: products, error: pErr } = await admin
    .from('marketing_email_settings')
    .select('product_id')
    .eq('enabled', true);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });

  let enqueued = 0;

  for (const { product_id } of products ?? []) {
    // Backfill auth.users as user.signed_up
    let page = 1;
    while (true) {
      const { data: usersPage, error: uErr } = await admin.auth.admin.listUsers(
        { page, perPage: 100 }
      );
      if (uErr) break;
      const users = usersPage?.users ?? [];
      if (users.length === 0) break;

      for (const user of users) {
        if (!user.email) continue;
        const { error: insErr } = await admin
          .from('marketing_email_sync_queue')
          .insert(
            {
              product_id,
              event_type: 'user.signed_up',
              email: user.email,
              payload: { user_id: user.id, created_at: user.created_at },
              idempotency_key: `bulk:user.signed_up:${product_id}:${user.id}`,
              status: 'pending',
            },
            { onConflict: 'idempotency_key', ignoreDuplicates: true }
          );
        if (!insErr) enqueued++;
      }

      if (users.length < 100) break;
      page++;
    }

    // Backfill waitlist_entries as waitlist.joined — paginated to avoid OOM.
    let ePage = 0;
    while (true) {
      const { data: entries } = await admin
        .from('waitlist_entries')
        .select('id, email, metadata')
        .range(ePage * 100, (ePage + 1) * 100 - 1);
      if (!entries?.length) break;

      for (const entry of entries) {
        if (!entry.email) continue;
        const { error: insErr } = await admin
          .from('marketing_email_sync_queue')
          .insert(
            {
              product_id,
              event_type: 'waitlist.joined',
              email: entry.email,
              payload: { entry_id: entry.id },
              idempotency_key: `bulk:waitlist.joined:${product_id}:${entry.id}`,
              status: 'pending',
            },
            { onConflict: 'idempotency_key', ignoreDuplicates: true }
          );
        if (!insErr) enqueued++;
      }

      if (entries.length < 100) break;
      ePage++;
    }
  }

  return Response.json({ enqueued });
}
