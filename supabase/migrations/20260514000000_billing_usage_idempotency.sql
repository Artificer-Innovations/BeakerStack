-- Adds idempotency_key to billing_usage_events and updates the RPC to deduplicate
-- on retry. Existing rows get NULL — they predate idempotency support.

ALTER TABLE public.billing_usage_events
    ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- Partial unique index: uniqueness is only enforced when a key is supplied.
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_usage_events_idempotency
    ON public.billing_usage_events (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Drop the old 4-param signature so the new 5-param signature with DEFAULT becomes
-- the sole target for callers that omit p_idempotency_key.
DROP FUNCTION IF EXISTS public.billing_record_usage_event(text, text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.billing_record_usage_event(
    p_product_id      text,
    p_event_type      text,
    p_quantity        integer DEFAULT 1,
    p_metadata        jsonb   DEFAULT '{}'::jsonb,
    p_idempotency_key uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid          uuid    := auth.uid();
    sub            public.billing_subscriptions;
    w              record;
    v_rows_inserted integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO sub
    FROM public.billing_subscriptions s
    WHERE s.user_id = v_uid AND s.product_id = p_product_id;

    IF NOT FOUND THEN
        PERFORM public.ensure_billing_subscription(p_product_id);
        SELECT * INTO sub
        FROM public.billing_subscriptions s
        WHERE s.user_id = v_uid AND s.product_id = p_product_id;
    END IF;

    SELECT * INTO w FROM public.billing_usage_period(sub);

    INSERT INTO public.billing_usage_events
        (user_id, product_id, event_type, quantity, metadata, idempotency_key)
    VALUES
        (v_uid, p_product_id, p_event_type,
         coalesce(p_quantity, 1),
         coalesce(p_metadata, '{}'::jsonb),
         p_idempotency_key)
    ON CONFLICT (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL
    DO NOTHING;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

    -- If the event was a duplicate, skip the aggregate update too.
    IF v_rows_inserted = 0 THEN
        RETURN;
    END IF;

    INSERT INTO public.billing_usage_aggregates
        (user_id, product_id, event_type, period_start, period_end, count)
    VALUES
        (v_uid, p_product_id, p_event_type, w.period_start, w.period_end, coalesce(p_quantity, 1))
    ON CONFLICT (user_id, product_id, event_type, period_start)
    DO UPDATE SET count      = public.billing_usage_aggregates.count + excluded.count,
                  period_end = excluded.period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_record_usage_event(text, text, integer, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_record_usage_event(text, text, integer, jsonb, uuid) TO authenticated;
