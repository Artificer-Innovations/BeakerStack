-- PR #274 review fixes: security, billing, audit, rate limits

-- ---------------------------------------------------------------------------
-- billing_ensure_subscription_plan: service_role only, explicit user, no downgrade
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.billing_ensure_subscription_plan(text, text);

CREATE OR REPLACE FUNCTION public.billing_ensure_subscription_plan(
    p_product_id text,
    p_plan_id text,
    p_user_id uuid
)
RETURNS public.billing_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r public.billing_subscriptions;
    v_plan public.billing_plans;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'invalid user';
    END IF;

    SELECT * INTO v_plan
    FROM public.billing_plans p
    WHERE p.id = p_plan_id
      AND p.product_id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid plan % for product %', p_plan_id, p_product_id;
    END IF;

    INSERT INTO public.billing_subscriptions (
        user_id, product_id, plan_id, status,
        stripe_customer_id, stripe_subscription_id,
        current_period_start, current_period_end
    )
    VALUES (
        p_user_id,
        p_product_id,
        p_plan_id,
        CASE WHEN v_plan.price_cents = 0 THEN 'free' ELSE 'active' END,
        NULL,
        NULL,
        date_trunc('month', now() AT TIME ZONE 'utc'),
        date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
    )
    ON CONFLICT (user_id, product_id) DO UPDATE
    SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        updated_at = now()
    WHERE public.billing_subscriptions.status NOT IN ('active', 'trialing', 'past_due');

    SELECT * INTO r
    FROM public.billing_subscriptions s
    WHERE s.user_id = p_user_id AND s.product_id = p_product_id;

    RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_ensure_subscription_plan(text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.billing_ensure_subscription_plan(text, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.billing_ensure_subscription_plan(text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- waitlist_consume_invite: re-check invite row after FOR UPDATE
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.waitlist_consume_invite(
    p_token text,
    p_user_id uuid,
    p_user_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valid jsonb;
    v_entry_id uuid;
    v_entry public.waitlist_entries;
    v_inv public.waitlist_invites;
    v_hash text;
    v_settings public.waitlist_settings;
    v_uid uuid := auth.uid();
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'invalid_user');
    END IF;

    IF v_uid IS NOT NULL AND v_uid IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('error', 'forbidden');
    END IF;

    v_valid := public.waitlist_validate_invite(p_token);
    IF NOT COALESCE((v_valid->>'valid')::boolean, false) THEN
        RETURN jsonb_build_object('error', 'invalid_invite');
    END IF;

    v_entry_id := (v_valid->>'entry_id')::uuid;
    v_hash := public._waitlist_hash_token(trim(p_token));

    SELECT * INTO v_inv FROM public.waitlist_invites WHERE token_hash = v_hash FOR UPDATE;
    SELECT * INTO v_entry FROM public.waitlist_entries WHERE id = v_entry_id FOR UPDATE;
    SELECT * INTO v_settings FROM public._waitlist_settings_row();

    IF v_inv.used_at IS NOT NULL OR v_inv.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'invite_already_used');
    END IF;

    IF v_entry.status = 'converted' AND v_entry.converted_user_id = p_user_id THEN
        RETURN jsonb_build_object(
            'ok', true,
            'already_converted', true,
            'default_plan_id', v_settings.default_plan_id
        );
    END IF;

    IF v_entry.status = 'converted' THEN
        RETURN jsonb_build_object('error', 'already_converted');
    END IF;

    IF v_settings.identity_match_mode = 'strict'
       AND p_user_email IS NOT NULL
       AND lower(trim(p_user_email)) IS DISTINCT FROM v_entry.email THEN
        RETURN jsonb_build_object('error', 'email_mismatch');
    END IF;

    IF v_settings.identity_match_mode = 'lenient'
       AND p_user_email IS NOT NULL
       AND lower(trim(p_user_email)) IS DISTINCT FROM v_entry.email THEN
        PERFORM public._admin_insert_audit(
            p_user_id,
            'waitlist.invite.email_mismatch',
            'waitlist_entry',
            v_entry_id::text,
            jsonb_build_object(
                'waitlist_email', v_entry.email,
                'auth_email', lower(trim(p_user_email))
            )
        );
    END IF;

    UPDATE public.waitlist_invites
    SET used_at = now()
    WHERE id = v_inv.id;

    UPDATE public.waitlist_entries
    SET
        status = 'converted',
        converted_at = now(),
        converted_user_id = p_user_id,
        active_invite_id = NULL
    WHERE id = v_entry_id;

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', v_entry_id,
        'default_plan_id', v_settings.default_plan_id
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- waitlist_capture: prune old rate rows, cap metadata size
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.waitlist_capture(
    p_email text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_client_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
    v_settings public.waitlist_settings;
    v_window timestamptz;
    v_ip_limit integer := 10;
    v_email_limit integer := 3;
    v_ip_count integer;
    v_email_count integer;
    v_copy jsonb;
    v_confirm text;
BEGIN
    DELETE FROM public.waitlist_rate_limits
    WHERE window_start < now() - interval '24 hours';

    IF pg_column_size(COALESCE(p_metadata, '{}'::jsonb)) > 8192 THEN
        RETURN jsonb_build_object('ok', true, 'message', 'Thanks — you are on the list.');
    END IF;

    SELECT * INTO v_settings FROM public._waitlist_settings_row();
    v_copy := COALESCE(v_settings.copy, '{}'::jsonb);
    v_confirm := COALESCE(
        v_copy #>> '{waitlist,confirmation}',
        'Thanks — you''re on the list.'
    );

    v_window := date_trunc('hour', now());

    IF p_client_ip IS NOT NULL AND length(trim(p_client_ip)) > 0 THEN
        INSERT INTO public.waitlist_rate_limits (bucket_key, window_start, count)
        VALUES ('ip:' || left(trim(p_client_ip), 64), v_window, 1)
        ON CONFLICT (bucket_key, window_start)
        DO UPDATE SET count = public.waitlist_rate_limits.count + 1
        RETURNING count INTO v_ip_count;

        IF v_ip_count > v_ip_limit THEN
            RETURN jsonb_build_object('ok', true, 'message', v_confirm);
        END IF;
    END IF;

    v_email := lower(trim(p_email));
    IF NOT public.is_valid_email(v_email) THEN
        RETURN jsonb_build_object('ok', true, 'message', v_confirm);
    END IF;

    INSERT INTO public.waitlist_rate_limits (bucket_key, window_start, count)
    VALUES ('email:' || v_email, v_window, 1)
    ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET count = public.waitlist_rate_limits.count + 1
    RETURNING count INTO v_email_count;

    IF v_email_count > v_email_limit THEN
        RETURN jsonb_build_object('ok', true, 'message', v_confirm);
    END IF;

    INSERT INTO public.waitlist_entries (email, metadata)
    VALUES (v_email, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (email) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'message', v_confirm);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin settings: VOLATILE + enum validation + fuller audit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_settings()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.waitlist_settings;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_row FROM public.waitlist_settings WHERE id = 1;

    RETURN jsonb_build_object(
        'signup_mode', v_row.signup_mode,
        'default_plan_id', v_row.default_plan_id,
        'invite_ttl_days', v_row.invite_ttl_days,
        'identity_match_mode', v_row.identity_match_mode,
        'copy', v_row.copy,
        'metadata_schema', v_row.metadata_schema,
        'updated_at', v_row.updated_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_entry(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.waitlist_entries;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_row FROM public.waitlist_entries WHERE id = p_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN jsonb_build_object(
        'id', v_row.id,
        'email', v_row.email,
        'status', v_row.status,
        'metadata', v_row.metadata,
        'submitted_at', v_row.submitted_at,
        'approved_at', v_row.approved_at,
        'rejected_at', v_row.rejected_at,
        'converted_at', v_row.converted_at,
        'converted_user_id', v_row.converted_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_waitlist_settings(
    p_signup_mode text DEFAULT NULL,
    p_default_plan_id text DEFAULT NULL,
    p_invite_ttl_days integer DEFAULT NULL,
    p_identity_match_mode text DEFAULT NULL,
    p_copy jsonb DEFAULT NULL,
    p_metadata_schema jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_signup_mode IS NOT NULL
       AND p_signup_mode NOT IN ('open', 'waitlist', 'invite_only', 'closed') THEN
        RETURN jsonb_build_object('error', 'invalid_signup_mode');
    END IF;

    IF p_identity_match_mode IS NOT NULL
       AND p_identity_match_mode NOT IN ('lenient', 'strict') THEN
        RETURN jsonb_build_object('error', 'invalid_identity_match_mode');
    END IF;

    IF p_invite_ttl_days IS NOT NULL AND p_invite_ttl_days < 1 THEN
        RETURN jsonb_build_object('error', 'invalid_invite_ttl_days');
    END IF;

    UPDATE public.waitlist_settings
    SET
        signup_mode = COALESCE(p_signup_mode, signup_mode),
        default_plan_id = COALESCE(p_default_plan_id, default_plan_id),
        invite_ttl_days = COALESCE(p_invite_ttl_days, invite_ttl_days),
        identity_match_mode = COALESCE(p_identity_match_mode, identity_match_mode),
        copy = COALESCE(p_copy, copy),
        metadata_schema = COALESCE(p_metadata_schema, metadata_schema),
        updated_at = now(),
        updated_by = v_uid
    WHERE id = 1;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.settings.update',
        'waitlist_settings',
        '1',
        jsonb_build_object(
            'signup_mode', p_signup_mode,
            'default_plan_id', p_default_plan_id,
            'invite_ttl_days', p_invite_ttl_days,
            'identity_match_mode', p_identity_match_mode,
            'copy', p_copy,
            'metadata_schema', p_metadata_schema
        )
    );

    RETURN public.admin_get_waitlist_settings();
END;
$$;

-- Trigram index for admin email search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS waitlist_entries_email_trgm_idx
    ON public.waitlist_entries USING gin (email gin_trgm_ops);
