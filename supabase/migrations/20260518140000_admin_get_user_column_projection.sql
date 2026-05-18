-- admin_get_user: explicit jsonb_build_object projections (no to_jsonb(table.*))
-- so future columns on joined tables are not silently exposed to operators.

CREATE OR REPLACE FUNCTION public.admin_get_user(
    p_user_id uuid,
    p_product_id text DEFAULT 'beakerstack'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_auth jsonb;
    v_profile jsonb;
    v_subscription jsonb;
    v_plan_id text;
    v_plan jsonb;
    v_usage_aggregates jsonb;
    v_usage_events jsonb;
    v_invoices jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at
    )
    INTO v_auth
    FROM auth.users u
    WHERE u.id = p_user_id;

    IF v_auth IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    PERFORM public._admin_insert_audit(
        v_uid,
        'admin.users.view',
        'user',
        p_user_id::text,
        jsonb_build_object('product_id', p_product_id)
    );

    SELECT jsonb_build_object(
        'display_name', p.display_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'website', p.website,
        'location', p.location,
        'created_at', p.created_at,
        'updated_at', p.updated_at
    )
    INTO v_profile
    FROM public.user_profiles p
    WHERE p.user_id = p_user_id;

    SELECT
        jsonb_build_object(
            'product_id', s.product_id,
            'plan_id', s.plan_id,
            'status', s.status,
            'current_period_start', s.current_period_start,
            'current_period_end', s.current_period_end,
            'cancel_at_period_end', s.cancel_at_period_end,
            'canceled_at', s.canceled_at,
            'trial_start', s.trial_start,
            'trial_end', s.trial_end,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        ),
        s.plan_id
    INTO v_subscription, v_plan_id
    FROM public.billing_subscriptions s
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    IF v_plan_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'id', pl.id,
            'display_name', pl.display_name,
            'description', pl.description,
            'price_cents', pl.price_cents,
            'billing_period', pl.billing_period,
            'features', pl.features,
            'usage_limits', pl.usage_limits,
            'trial_period_days', pl.trial_period_days,
            'is_public', pl.is_public,
            'display_order', pl.display_order
        )
        INTO v_plan
        FROM public.billing_plans pl
        WHERE pl.id = v_plan_id;
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'event_type', a.event_type,
                'product_id', a.product_id,
                'period_start', a.period_start,
                'period_end', a.period_end,
                'count', a.count
            )
            ORDER BY a.event_type
        ),
        '[]'::jsonb
    )
    INTO v_usage_aggregates
    FROM public.billing_usage_aggregates a
    WHERE a.user_id = p_user_id
      AND a.product_id = p_product_id
      AND a.period_start <= now()
      AND a.period_end > now();

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'event_type', e.event_type,
                'product_id', e.product_id,
                'quantity', e.quantity,
                'created_at', e.created_at
            )
            ORDER BY e.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_usage_events
    FROM (
        SELECT e.event_type, e.product_id, e.quantity, e.created_at
        FROM public.billing_usage_events e
        WHERE e.user_id = p_user_id
          AND e.product_id = p_product_id
        ORDER BY e.created_at DESC
        LIMIT 100
    ) e;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'stripe_invoice_id', i.stripe_invoice_id,
                'status', i.status,
                'amount_due', i.amount_due,
                'amount_paid', i.amount_paid,
                'currency', i.currency,
                'description', i.description,
                'hosted_invoice_url', i.hosted_invoice_url,
                'period_start', i.period_start,
                'period_end', i.period_end,
                'created_at', i.created_at,
                'finalized_at', i.finalized_at,
                'paid_at', i.paid_at
            )
            ORDER BY i.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_invoices
    FROM (
        SELECT
            i.id,
            i.stripe_invoice_id,
            i.status,
            i.amount_due,
            i.amount_paid,
            i.currency,
            i.description,
            i.hosted_invoice_url,
            i.period_start,
            i.period_end,
            i.created_at,
            i.finalized_at,
            i.paid_at
        FROM public.billing_invoices i
        WHERE i.user_id = p_user_id
        ORDER BY i.created_at DESC
        LIMIT 20
    ) i;

    RETURN jsonb_build_object(
        'auth', v_auth,
        'profile', v_profile,
        'subscription', v_subscription,
        'plan', v_plan,
        'usage_aggregates', v_usage_aggregates,
        'usage_events', v_usage_events,
        'invoices', v_invoices
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid, text) TO authenticated;
