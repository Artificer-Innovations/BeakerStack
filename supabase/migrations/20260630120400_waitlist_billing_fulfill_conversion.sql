-- Waitlist-billing integration: fulfill provisioning intent at conversion time.

CREATE OR REPLACE FUNCTION public.waitlist_billing_fulfill_conversion(
    p_user_id uuid,
    p_entry_id uuid,
    p_product_id text,
    p_allowed_comp_plan_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry public.waitlist_entries;
    v_intent jsonb;
    v_kind text;
    v_plan_id text;
    v_reason text;
    v_granted_by uuid;
    v_grant jsonb;
    v_sub public.billing_subscriptions;
BEGIN
    IF p_user_id IS NULL OR p_entry_id IS NULL OR p_product_id IS NULL THEN
        RETURN jsonb_build_object('error', 'invalid_request');
    END IF;

    SELECT * INTO v_entry
    FROM public.waitlist_entries e
    WHERE e.id = p_entry_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF v_entry.status <> 'converted' OR v_entry.converted_user_id IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('error', 'not_converted');
    END IF;

    v_intent := v_entry.metadata->'provisioning_intent';
    IF v_intent IS NULL OR jsonb_typeof(v_intent) <> 'object' THEN
        RETURN jsonb_build_object('ok', true);
    END IF;

    v_kind := nullif(btrim(v_intent->>'kind'), '');
    v_plan_id := nullif(btrim(v_intent->>'planId'), '');

    IF v_kind = 'billing_comp' THEN
        IF v_plan_id IS NULL THEN
            RETURN jsonb_build_object('error', 'invalid_intent');
        END IF;

        IF p_allowed_comp_plan_ids IS NOT NULL
           AND NOT (v_plan_id = ANY (p_allowed_comp_plan_ids)) THEN
            RETURN jsonb_build_object('error', 'plan_not_allowed');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.billing_plans pl
            WHERE pl.id = v_plan_id
              AND pl.product_id = p_product_id
              AND pl.is_public = false
        ) THEN
            RETURN jsonb_build_object('error', 'invalid_plan');
        END IF;

        v_reason := nullif(btrim(v_intent->>'reason'), '');
        IF v_reason IS NULL THEN
            RETURN jsonb_build_object('error', 'invalid_reason');
        END IF;

        BEGIN
            v_granted_by := (v_intent->>'grantedBy')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            v_granted_by := NULL;
        END;

        SELECT * INTO v_sub
        FROM public.billing_subscriptions s
        WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

        IF v_sub.status = 'comped'
           AND v_sub.plan_id = v_plan_id
           AND EXISTS (
                SELECT 1 FROM public.billing_comp_grants g
                WHERE g.user_id = p_user_id
                  AND g.product_id = p_product_id
                  AND g.revoked_at IS NULL
                  AND g.plan_id = v_plan_id
                  AND g.comp_expires_at IS NULL
            ) THEN
            RETURN jsonb_build_object('ok', true, 'unchanged', true);
        END IF;

        v_grant := public._billing_apply_comp_grant(
            p_user_id,
            p_product_id,
            v_plan_id,
            v_reason,
            v_granted_by,
            NULL,
            'waitlist_invite'
        );

        IF v_grant ? 'error' THEN
            RETURN v_grant;
        END IF;

        IF COALESCE((v_grant->>'unchanged')::boolean, false) THEN
            RETURN jsonb_build_object('ok', true, 'unchanged', true);
        END IF;

        RETURN jsonb_build_object('ok', true, 'comp_applied', true);
    END IF;

    IF v_kind = 'billing_plan' THEN
        IF v_plan_id IS NULL THEN
            RETURN jsonb_build_object('error', 'invalid_intent');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.billing_plans pl
            WHERE pl.id = v_plan_id
              AND pl.product_id = p_product_id
              AND pl.is_public = true
        ) THEN
            RETURN jsonb_build_object('error', 'invalid_plan');
        END IF;

        SELECT * INTO v_sub
        FROM public.billing_subscriptions s
        WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

        IF FOUND AND v_sub.plan_id = v_plan_id THEN
            RETURN jsonb_build_object('ok', true, 'unchanged', true);
        END IF;

        PERFORM public.billing_ensure_subscription_plan(
            p_product_id,
            v_plan_id,
            p_user_id
        );

        RETURN jsonb_build_object('ok', true, 'plan_applied', true);
    END IF;

    RETURN jsonb_build_object('error', 'invalid_intent_kind');
END;
$$;

REVOKE ALL ON FUNCTION public.waitlist_billing_fulfill_conversion(uuid, uuid, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_billing_fulfill_conversion(uuid, uuid, text, text[]) TO service_role;
