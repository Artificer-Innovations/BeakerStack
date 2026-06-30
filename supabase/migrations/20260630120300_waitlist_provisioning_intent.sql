-- Waitlist provisioning intent: per-invite VIP/plan pre-configuration (billing-agnostic).

-- Shape + allowlist validation for admin-set intent. Reads billing_plans (existence,
-- is_public) but intentionally omits product_id — waitlist_billing_fulfill_conversion
-- enforces product_id at conversion time.
CREATE OR REPLACE FUNCTION public._waitlist_validate_provisioning_intent(
    p_intent jsonb,
    p_granted_by uuid,
    p_allowed_comp_plan_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_kind text;
    v_plan_id text;
    v_reason text;
BEGIN
    IF p_intent IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'clear', true);
    END IF;

    IF jsonb_typeof(p_intent) <> 'object' THEN
        RETURN jsonb_build_object('error', 'invalid_intent');
    END IF;

    v_kind := nullif(btrim(p_intent->>'kind'), '');
    IF v_kind NOT IN ('billing_comp', 'billing_plan') THEN
        RETURN jsonb_build_object('error', 'invalid_intent_kind');
    END IF;

    v_plan_id := nullif(btrim(p_intent->>'planId'), '');
    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object('error', 'invalid_plan_id');
    END IF;

    IF v_kind = 'billing_comp' THEN
        v_reason := nullif(btrim(p_intent->>'reason'), '');
        IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
            RETURN jsonb_build_object('error', 'invalid_reason');
        END IF;

        IF p_allowed_comp_plan_ids IS NOT NULL
           AND NOT (v_plan_id = ANY (p_allowed_comp_plan_ids)) THEN
            RETURN jsonb_build_object('error', 'plan_not_allowed');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.billing_plans pl
            WHERE pl.id = v_plan_id AND pl.is_public = false
        ) THEN
            RETURN jsonb_build_object('error', 'invalid_comp_plan');
        END IF;

        RETURN jsonb_build_object(
            'ok', true,
            'intent', jsonb_build_object(
                'kind', 'billing_comp',
                'planId', v_plan_id,
                'reason', v_reason,
                'grantedBy', p_granted_by
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.billing_plans pl
        WHERE pl.id = v_plan_id AND pl.is_public = true
    ) THEN
        RETURN jsonb_build_object('error', 'invalid_public_plan');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'intent', jsonb_build_object(
            'kind', 'billing_plan',
            'planId', v_plan_id
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public._waitlist_validate_provisioning_intent(jsonb, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._waitlist_validate_provisioning_intent(jsonb, uuid, text[]) TO service_role;

CREATE OR REPLACE FUNCTION public._waitlist_merge_provisioning_intent(
    p_metadata jsonb,
    p_validated jsonb
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN COALESCE((p_validated->>'clear')::boolean, false) THEN
            COALESCE(p_metadata, '{}'::jsonb) - 'provisioning_intent'
        WHEN p_validated ? 'intent' THEN
            jsonb_set(
                COALESCE(p_metadata, '{}'::jsonb),
                '{provisioning_intent}',
                p_validated->'intent',
                true
            )
        ELSE COALESCE(p_metadata, '{}'::jsonb)
    END;
$$;

REVOKE ALL ON FUNCTION public._waitlist_merge_provisioning_intent(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._waitlist_merge_provisioning_intent(jsonb, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public._waitlist_consume_response(
    p_entry_id uuid,
    p_default_plan_id text,
    p_already_converted boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_intent jsonb;
BEGIN
    SELECT e.metadata->'provisioning_intent'
      INTO v_intent
    FROM public.waitlist_entries e
    WHERE e.id = p_entry_id;

    IF p_already_converted THEN
        RETURN jsonb_build_object(
            'ok', true,
            'already_converted', true,
            'entry_id', p_entry_id,
            'default_plan_id', p_default_plan_id,
            'provisioning_intent', v_intent
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', p_entry_id,
        'default_plan_id', p_default_plan_id,
        'provisioning_intent', v_intent
    );
END;
$$;

REVOKE ALL ON FUNCTION public._waitlist_consume_response(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._waitlist_consume_response(uuid, text, boolean) TO service_role;

DROP FUNCTION IF EXISTS public.admin_invite_waitlist_email(text, jsonb);

CREATE OR REPLACE FUNCTION public.admin_invite_waitlist_email(
    p_email text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_provisioning_intent jsonb DEFAULT NULL,
    p_update_provisioning_intent boolean DEFAULT false,
    p_allowed_comp_plan_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_email text;
    v_entry public.waitlist_entries;
    v_invite record;
    v_created boolean := false;
    v_validated jsonb;
    v_metadata jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    v_email := lower(trim(p_email));
    IF NOT public.is_valid_email(v_email) THEN
        RETURN jsonb_build_object('error', 'invalid_email');
    END IF;

    IF p_update_provisioning_intent THEN
        v_validated := public._waitlist_validate_provisioning_intent(
            p_provisioning_intent,
            v_uid,
            p_allowed_comp_plan_ids
        );
        IF v_validated ? 'error' THEN
            RETURN jsonb_build_object('error', v_validated->>'error');
        END IF;
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE email = v_email FOR UPDATE;

    IF NOT FOUND THEN
        v_metadata := jsonb_build_object('source', 'admin_invite') || COALESCE(p_metadata, '{}'::jsonb);
        IF p_update_provisioning_intent THEN
            v_metadata := public._waitlist_merge_provisioning_intent(v_metadata, v_validated);
        END IF;
        INSERT INTO public.waitlist_entries (email, metadata)
        VALUES (v_email, v_metadata)
        RETURNING * INTO v_entry;
        v_created := true;
    ELSIF v_entry.status = 'converted' THEN
        RETURN jsonb_build_object('error', 'already_converted');
    ELSE
        v_metadata := COALESCE(v_entry.metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb);
        IF p_update_provisioning_intent THEN
            v_metadata := public._waitlist_merge_provisioning_intent(v_metadata, v_validated);
        END IF;
        UPDATE public.waitlist_entries
        SET metadata = v_metadata
        WHERE id = v_entry.id
        RETURNING * INTO v_entry;
    END IF;

    SELECT * INTO v_invite
    FROM public._waitlist_create_invite(v_entry.id, v_uid);

    UPDATE public.waitlist_entries
    SET
        status = 'approved',
        approved_at = COALESCE(approved_at, now()),
        rejected_at = NULL
    WHERE id = v_entry.id;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.entry.invite_email',
        'waitlist_entry',
        v_entry.id::text,
        jsonb_build_object(
            'email', v_email,
            'created', v_created,
            'provisioning_intent', CASE
                WHEN p_update_provisioning_intent THEN v_metadata->'provisioning_intent'
                ELSE NULL
            END
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', v_entry.id,
        'invite_token', v_invite.raw_token,
        'email', v_email,
        'created', v_created
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_invite_waitlist_email(text, jsonb, jsonb, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_invite_waitlist_email(text, jsonb, jsonb, boolean, text[]) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_approve_waitlist_entry(uuid);

CREATE OR REPLACE FUNCTION public.admin_approve_waitlist_entry(
    p_id uuid,
    p_provisioning_intent jsonb DEFAULT NULL,
    p_update_provisioning_intent boolean DEFAULT false,
    p_allowed_comp_plan_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_entry public.waitlist_entries;
    v_invite record;
    v_validated jsonb;
    v_metadata jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF v_entry.status NOT IN ('pending', 'approved') THEN
        RETURN jsonb_build_object('error', 'invalid_status');
    END IF;

    IF p_update_provisioning_intent THEN
        v_validated := public._waitlist_validate_provisioning_intent(
            p_provisioning_intent,
            v_uid,
            p_allowed_comp_plan_ids
        );
        IF v_validated ? 'error' THEN
            RETURN jsonb_build_object('error', v_validated->>'error');
        END IF;
        v_metadata := public._waitlist_merge_provisioning_intent(
            COALESCE(v_entry.metadata, '{}'::jsonb),
            v_validated
        );
        UPDATE public.waitlist_entries
        SET metadata = v_metadata
        WHERE id = p_id
        RETURNING * INTO v_entry;
    END IF;

    SELECT * INTO v_invite
    FROM public._waitlist_create_invite(p_id, v_uid);

    UPDATE public.waitlist_entries
    SET
        status = 'approved',
        approved_at = COALESCE(approved_at, now()),
        rejected_at = NULL
    WHERE id = p_id;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.entry.approve',
        'waitlist_entry',
        p_id::text,
        jsonb_build_object(
            'email', v_entry.email,
            'provisioning_intent', CASE
                WHEN p_update_provisioning_intent THEN v_entry.metadata->'provisioning_intent'
                ELSE NULL
            END
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', p_id,
        'invite_token', v_invite.raw_token,
        'email', v_entry.email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_waitlist_entry(uuid, jsonb, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_waitlist_entry(uuid, jsonb, boolean, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_waitlist_entry_provisioning_intent(
    p_entry_id uuid,
    p_provisioning_intent jsonb DEFAULT NULL,
    p_allowed_comp_plan_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_entry public.waitlist_entries;
    v_validated jsonb;
    v_metadata jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF v_entry.status NOT IN ('pending', 'approved') THEN
        RETURN jsonb_build_object('error', 'invalid_status');
    END IF;

    v_validated := public._waitlist_validate_provisioning_intent(
        p_provisioning_intent,
        v_uid,
        p_allowed_comp_plan_ids
    );
    IF v_validated ? 'error' THEN
        RETURN jsonb_build_object('error', v_validated->>'error');
    END IF;

    v_metadata := public._waitlist_merge_provisioning_intent(
        COALESCE(v_entry.metadata, '{}'::jsonb),
        v_validated
    );

    UPDATE public.waitlist_entries
    SET metadata = v_metadata
    WHERE id = p_entry_id;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.entry.set_provisioning_intent',
        'waitlist_entry',
        p_entry_id::text,
        jsonb_build_object(
            'email', v_entry.email,
            'provisioning_intent', v_metadata->'provisioning_intent'
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', p_entry_id,
        'provisioning_intent', v_metadata->'provisioning_intent'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_waitlist_entry_provisioning_intent(uuid, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_waitlist_entry_provisioning_intent(uuid, jsonb, text[]) TO authenticated;

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
    v_valid         jsonb;
    v_entry_id      uuid;
    v_entry         public.waitlist_entries;
    v_inv           public.waitlist_invites;
    v_hash          text;
    v_settings      public.waitlist_settings;
    v_uid           uuid := auth.uid();
    v_pre_used_at   timestamptz;
    v_pre_converted uuid;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'invalid_user');
    END IF;

    IF v_uid IS NOT NULL AND v_uid IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('error', 'forbidden');
    END IF;

    v_hash := public._waitlist_hash_token(trim(p_token));
    SELECT i.used_at, e.converted_user_id, e.id
      INTO v_pre_used_at, v_pre_converted, v_entry_id
    FROM public.waitlist_invites i
    JOIN public.waitlist_entries e ON e.id = i.entry_id
    WHERE i.token_hash = v_hash;

    IF FOUND
       AND v_pre_used_at   IS NOT NULL
       AND v_pre_converted IS NOT DISTINCT FROM p_user_id THEN
        SELECT * INTO v_settings FROM public._waitlist_settings_row();
        RETURN public._waitlist_consume_response(
            v_entry_id,
            v_settings.default_plan_id,
            true
        );
    END IF;

    v_valid := public.waitlist_validate_invite(p_token);
    IF NOT COALESCE((v_valid->>'valid')::boolean, false) THEN
        RETURN jsonb_build_object('error', 'invalid_invite');
    END IF;

    v_entry_id := (v_valid->>'entry_id')::uuid;

    SELECT * INTO v_inv   FROM public.waitlist_invites  WHERE token_hash = v_hash FOR UPDATE;
    SELECT * INTO v_entry FROM public.waitlist_entries  WHERE id = v_entry_id     FOR UPDATE;
    SELECT * INTO v_settings FROM public._waitlist_settings_row();

    IF v_inv.used_at IS NOT NULL OR v_inv.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'invite_already_used');
    END IF;

    IF v_entry.status = 'converted' AND v_entry.converted_user_id = p_user_id THEN
        RETURN public._waitlist_consume_response(
            v_entry_id,
            v_settings.default_plan_id,
            true
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
                'auth_email',     lower(trim(p_user_email))
            )
        );
    END IF;

    UPDATE public.waitlist_invites
    SET used_at = now()
    WHERE id = v_inv.id;

    UPDATE public.waitlist_entries
    SET
        status            = 'converted',
        converted_at      = now(),
        converted_user_id = p_user_id,
        active_invite_id  = NULL
    WHERE id = v_entry_id;

    RETURN public._waitlist_consume_response(
        v_entry_id,
        v_settings.default_plan_id,
        false
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

    IF p_default_plan_id IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM public.billing_plans pl
            WHERE pl.id = p_default_plan_id AND pl.is_public = true
        ) THEN
        RETURN jsonb_build_object('error', 'invalid_default_plan_id');
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

DO $$
DECLARE
    v_bad text;
BEGIN
    SELECT default_plan_id INTO v_bad
    FROM public.waitlist_settings
    WHERE id = 1
      AND EXISTS (
            SELECT 1 FROM public.billing_plans pl
            WHERE pl.id = waitlist_settings.default_plan_id
              AND pl.is_public = false
        );

    IF v_bad IS NOT NULL THEN
        RAISE WARNING 'waitlist_settings.default_plan_id % references a non-public plan; update via Admin → Waitlist settings', v_bad;
    END IF;
END;
$$;
