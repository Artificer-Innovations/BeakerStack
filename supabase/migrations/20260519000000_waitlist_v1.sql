-- BeakerStack Waitlist v1: signup modes, entries, invites, rate limits, RPCs

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Types / enums (text + check for portability)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waitlist_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    signup_mode text NOT NULL DEFAULT 'open'
        CHECK (signup_mode IN ('open', 'waitlist', 'invite_only', 'closed')),
    default_plan_id text NOT NULL DEFAULT 'beakerstack_free',
    invite_ttl_days integer NOT NULL DEFAULT 7
        CHECK (invite_ttl_days >= 1 AND invite_ttl_days <= 90),
    identity_match_mode text NOT NULL DEFAULT 'lenient'
        CHECK (identity_match_mode IN ('lenient', 'strict')),
    copy jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    rejected_at timestamptz,
    converted_at timestamptz,
    converted_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    active_invite_id uuid,
    CONSTRAINT waitlist_entries_email_normalized CHECK (email = lower(trim(email))),
    CONSTRAINT waitlist_entries_email_valid CHECK (public.is_valid_email(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_entries_email_lower
    ON public.waitlist_entries (email);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status_submitted
    ON public.waitlist_entries (status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.waitlist_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL REFERENCES public.waitlist_entries (id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_invites_token_hash
    ON public.waitlist_invites (token_hash);

CREATE INDEX IF NOT EXISTS idx_waitlist_invites_entry_active
    ON public.waitlist_invites (entry_id)
    WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_active_invite_fkey
    FOREIGN KEY (active_invite_id) REFERENCES public.waitlist_invites (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.waitlist_rate_limits (
    bucket_key text NOT NULL,
    window_start timestamptz NOT NULL,
    count integer NOT NULL DEFAULT 1,
    PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_rate_limits_window
    ON public.waitlist_rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- RLS: enabled, no policies for anon/authenticated
-- ---------------------------------------------------------------------------

ALTER TABLE public.waitlist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_rate_limits ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._waitlist_hash_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
    SELECT encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

REVOKE ALL ON FUNCTION public._waitlist_hash_token(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._waitlist_settings_row()
RETURNS public.waitlist_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.waitlist_settings WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public._waitlist_settings_row() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._waitlist_create_invite(
    p_entry_id uuid,
    p_actor uuid
)
RETURNS TABLE (invite_id uuid, raw_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_settings public.waitlist_settings;
    v_raw text;
    v_hash text;
    v_invite_id uuid;
BEGIN
    SELECT * INTO v_settings FROM public._waitlist_settings_row();

    v_raw := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := public._waitlist_hash_token(v_raw);

    UPDATE public.waitlist_invites
    SET revoked_at = now()
    WHERE entry_id = p_entry_id
      AND used_at IS NULL
      AND revoked_at IS NULL;

    INSERT INTO public.waitlist_invites (
        entry_id, token_hash, expires_at, created_by
    )
    VALUES (
        p_entry_id,
        v_hash,
        now() + (v_settings.invite_ttl_days || ' days')::interval,
        p_actor
    )
    RETURNING id INTO v_invite_id;

    UPDATE public.waitlist_entries
    SET active_invite_id = v_invite_id
    WHERE id = p_entry_id;

    invite_id := v_invite_id;
    raw_token := v_raw;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._waitlist_create_invite(uuid, uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- RPC: public settings (signup mode + copy only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.waitlist_get_public_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'signup_mode', s.signup_mode,
        'copy', s.copy,
        'metadata_schema', s.metadata_schema
    )
    FROM public.waitlist_settings s
    WHERE s.id = 1;
$$;

REVOKE ALL ON FUNCTION public.waitlist_get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_get_public_settings() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: validate invite (anon)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.waitlist_validate_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hash text;
    v_inv public.waitlist_invites;
    v_entry public.waitlist_entries;
    v_settings public.waitlist_settings;
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    v_hash := public._waitlist_hash_token(trim(p_token));

    SELECT i.* INTO v_inv
    FROM public.waitlist_invites i
    WHERE i.token_hash = v_hash
    LIMIT 1;

    IF NOT FOUND
       OR v_inv.used_at IS NOT NULL
       OR v_inv.revoked_at IS NOT NULL
       OR v_inv.expires_at <= now() THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT e.* INTO v_entry
    FROM public.waitlist_entries e
    WHERE e.id = v_inv.entry_id;

    IF NOT FOUND OR v_entry.status <> 'approved' THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT * INTO v_settings FROM public._waitlist_settings_row();

    RETURN jsonb_build_object(
        'valid', true,
        'entry_id', v_entry.id,
        'email', v_entry.email,
        'expires_at', v_inv.expires_at,
        'identity_match_mode', v_settings.identity_match_mode,
        'default_plan_id', v_settings.default_plan_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.waitlist_validate_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_validate_invite(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: consume invite (service role / internal via Edge)
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

    -- Service role calls with auth.uid() null; allow when role is service_role
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

    IF v_entry.status = 'converted' AND v_entry.converted_user_id = p_user_id THEN
        RETURN jsonb_build_object('ok', true, 'already_converted', true);
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

REVOKE ALL ON FUNCTION public.waitlist_consume_invite(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_consume_invite(text, uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RPC: capture entry (service role — Edge Function)
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
        -- Uniform success — do not leak validation details
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

REVOKE ALL ON FUNCTION public.waitlist_capture(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_capture(text, jsonb, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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

REVOKE ALL ON FUNCTION public.admin_get_waitlist_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_waitlist_settings() TO authenticated;

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
            'default_plan_id', p_default_plan_id
        )
    );

    RETURN public.admin_get_waitlist_settings();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_waitlist_settings(text, text, integer, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_waitlist_settings(text, text, integer, text, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_waitlist_entries(
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_total bigint;
    v_rows jsonb;
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
    v_search text;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF p_search IS NULL OR length(trim(p_search)) = 0 THEN
        v_search := NULL;
    ELSE
        v_search := left(
            replace(
                replace(replace(trim(p_search), '\', '\\'), '%', '\%'),
                '_',
                '\_'
            ),
            200
        );
    END IF;

    SELECT count(*)::bigint INTO v_total
    FROM public.waitlist_entries e
    WHERE (v_search IS NULL OR e.email ILIKE '%' || v_search || '%' ESCAPE '\')
      AND (p_status IS NULL OR e.status = p_status);

    SELECT COALESCE(jsonb_agg(t.row_data ORDER BY t.submitted_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
        SELECT
            jsonb_build_object(
                'id', e.id,
                'email', e.email,
                'status', e.status,
                'metadata', e.metadata,
                'submitted_at', e.submitted_at,
                'approved_at', e.approved_at,
                'rejected_at', e.rejected_at,
                'converted_at', e.converted_at,
                'converted_user_id', e.converted_user_id,
                'has_active_invite', EXISTS (
                    SELECT 1 FROM public.waitlist_invites i
                    WHERE i.id = e.active_invite_id
                      AND i.used_at IS NULL
                      AND i.revoked_at IS NULL
                      AND i.expires_at > now()
                )
            ) AS row_data,
            e.submitted_at
        FROM public.waitlist_entries e
        WHERE (v_search IS NULL OR e.email ILIKE '%' || v_search || '%' ESCAPE '\')
          AND (p_status IS NULL OR e.status = p_status)
        ORDER BY e.submitted_at DESC
        LIMIT v_limit
        OFFSET v_offset
    ) t;

    RETURN jsonb_build_object(
        'entries', v_rows,
        'total', v_total,
        'limit', v_limit,
        'offset', v_offset
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_waitlist_entries(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_waitlist_entries(integer, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_waitlist_entry(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
        'converted_user_id', v_row.converted_user_id,
        'has_active_invite', EXISTS (
            SELECT 1 FROM public.waitlist_invites i
            WHERE i.id = v_row.active_invite_id
              AND i.used_at IS NULL
              AND i.revoked_at IS NULL
              AND i.expires_at > now()
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_waitlist_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_waitlist_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_waitlist_entry(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_entry public.waitlist_entries;
    v_invite record;
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
        jsonb_build_object('email', v_entry.email)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', p_id,
        'invite_token', v_invite.raw_token,
        'email', v_entry.email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_waitlist_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_waitlist_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_waitlist_entry(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_entry public.waitlist_entries;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF v_entry.status = 'converted' THEN
        RETURN jsonb_build_object('error', 'invalid_status');
    END IF;

    UPDATE public.waitlist_invites
    SET revoked_at = now()
    WHERE entry_id = p_id
      AND used_at IS NULL
      AND revoked_at IS NULL;

    UPDATE public.waitlist_entries
    SET
        status = 'rejected',
        rejected_at = now(),
        active_invite_id = NULL
    WHERE id = p_id;

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.entry.reject',
        'waitlist_entry',
        p_id::text,
        jsonb_build_object('email', v_entry.email)
    );

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_waitlist_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_waitlist_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resend_waitlist_invite(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_entry public.waitlist_entries;
    v_invite record;
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    IF v_entry.status <> 'approved' THEN
        RETURN jsonb_build_object('error', 'invalid_status');
    END IF;

    SELECT * INTO v_invite
    FROM public._waitlist_create_invite(p_id, v_uid);

    PERFORM public._admin_insert_audit(
        v_uid,
        'waitlist.entry.resend_invite',
        'waitlist_entry',
        p_id::text,
        jsonb_build_object('email', v_entry.email)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'entry_id', p_id,
        'invite_token', v_invite.raw_token,
        'email', v_entry.email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resend_waitlist_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resend_waitlist_invite(uuid) TO authenticated;
