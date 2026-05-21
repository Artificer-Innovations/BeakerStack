// Worker: dequeues marketing_email_sync_queue rows and calls Kit Creator API v4.
// Scheduled every 5 min via pg_cron + pg_net (see kit_sync_cron migration).
// Auth: Bearer token matching KIT_CRON_SECRET env var.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  KitClient,
  KitClientError,
  isPermanentKitError,
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
  const settingsCache = new Map<string, SettingsConfig | null>();

  for (const row of (rows as QueueRow[]) ?? []) {
    try {
      // Cache settings per product_id to avoid repeated lookups within a batch
      if (!settingsCache.has(row.product_id)) {
        const { data } = await admin
          .from('marketing_email_settings')
          .select('config')
          .eq('product_id', row.product_id)
          .eq('enabled', true)
          .maybeSingle();
        settingsCache.set(row.product_id, (data?.config as SettingsConfig) ?? null);
      }
      const config = settingsCache.get(row.product_id) ?? null;

      if (!config) {
        await markDone(admin, row.id);
        skipped++;
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
      const newAttempts = row.attempts + 1;
      const deadLetter = isPermanentKitError(code) || newAttempts >= 5;

      await admin
        .from('marketing_email_sync_queue')
        .update({
          status: deadLetter ? 'failed' : 'pending',
          attempts: newAttempts,
          last_attempted_at: new Date().toISOString(),
          error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        })
        .eq('id', row.id);
    }
  }

  return Response.json({ processed, skipped, failed });
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

  switch (event_type) {
    case 'user.signed_up': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, signupTag(ns, opts));
      const planId = payload.plan_id as string | undefined;
      if (planId) {
        await kit.applyTag(email, interestTag(ns, planId, opts));
      }
      break;
    }
    case 'waitlist.joined': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, waitlistTag(ns, opts));
      break;
    }
    case 'waitlist.approved': {
      if (formId) await kit.subscribeToForm(email, formId);
      await kit.applyTag(email, waitlistApprovedTag(ns, opts));
      break;
    }
    case 'waitlist.converted': {
      await kit.removeTag(email, waitlistTag(ns, opts));
      await kit.applyTag(email, convertedTag(ns, opts));
      break;
    }
    case 'user.tier_changed': {
      const newPlanId = payload.new_plan_id as string | undefined;
      if (!newPlanId) throw new Error('user.tier_changed payload missing new_plan_id');
      for (const t of config.tierTagNames ?? []) {
        await kit.removeTag(email, tierTag(ns, t, opts));
      }
      await kit.applyTag(email, tierTag(ns, newPlanId, opts));
      break;
    }
    case 'user.churned': {
      for (const t of config.tierTagNames ?? []) {
        await kit.removeTag(email, tierTag(ns, t, opts));
      }
      await kit.applyTag(email, churnedTag(ns, opts));
      if ((config.onChurn ?? 'tag_only') === 'unsubscribe') {
        await kit.unsubscribeUser(email);
      }
      break;
    }
    default:
      throw new Error(`Unknown event_type: ${event_type}`);
  }
}

async function markDone(
  admin: ReturnType<typeof createClient>,
  id: number
): Promise<void> {
  await admin
    .from('marketing_email_sync_queue')
    .update({ status: 'done', processed_at: new Date().toISOString() })
    .eq('id', id);
}

// Enqueues user.signed_up for all auth.users and waitlist.joined for all
// waitlist_entries where settings are enabled, using idempotency keys so
// re-runs are safe. Processes one product_id at a time.
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
      const { data: usersPage, error: uErr } =
        await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (uErr) break;
      const users = usersPage?.users ?? [];
      if (users.length === 0) break;

      for (const user of users) {
        if (!user.email) continue;
        const { error: insErr } = await admin
          .from('marketing_email_sync_queue')
          .insert({
            product_id,
            event_type: 'user.signed_up',
            email: user.email,
            payload: { user_id: user.id, created_at: user.created_at },
            idempotency_key: `bulk:user.signed_up:${product_id}:${user.id}`,
            status: 'pending',
          })
          .onConflict('idempotency_key')
          .ignore();
        if (!insErr) enqueued++;
      }

      if (users.length < 100) break;
      page++;
    }

    // Backfill waitlist_entries as waitlist.joined
    const { data: entries } = await admin
      .from('waitlist_entries')
      .select('id, email, metadata');
    for (const entry of entries ?? []) {
      if (!entry.email) continue;
      const { error: insErr } = await admin
        .from('marketing_email_sync_queue')
        .insert({
          product_id,
          event_type: 'waitlist.joined',
          email: entry.email,
          payload: { entry_id: entry.id },
          idempotency_key: `bulk:waitlist.joined:${product_id}:${entry.id}`,
          status: 'pending',
        })
        .onConflict('idempotency_key')
        .ignore();
      if (!insErr) enqueued++;
    }
  }

  return Response.json({ enqueued });
}
