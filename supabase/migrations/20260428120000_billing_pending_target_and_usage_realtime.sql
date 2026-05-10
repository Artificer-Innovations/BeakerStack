-- Scheduled downgrade target (set by schedule_cancel_to_free Edge path; cleared on reactivate / period sync).
ALTER TABLE public.billing_subscriptions
    ADD COLUMN IF NOT EXISTS pending_target_plan_id text REFERENCES public.billing_plans (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.billing_subscriptions.pending_target_plan_id IS
    'When cancel_at_period_end is true, optional plan user will move to (e.g. free). Set by app Edge; NULL for portal-only cancels (cancelled_pending vs downgrade_pending).';

-- Realtime for usage aggregates so meters refresh without subscription-only events.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_usage_aggregates;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE public.billing_usage_aggregates REPLICA IDENTITY FULL;
