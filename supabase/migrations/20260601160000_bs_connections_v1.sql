-- @beakerstack/connections v1 — pending TTL: 30 days (connections_pending_ttl)
-- Tables: bs_connections, bs_connections_audit
-- RPCs: connections_request, accept, decline, block, unblock, disconnect, list, get_status, search_users

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connections_pending_ttl()
RETURNS interval
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT interval '30 days';
$$;

CREATE OR REPLACE FUNCTION public.connections_effective_status(
    p_status text,
    p_created_at timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p_status = 'pending'
             AND p_created_at < now() - public.connections_pending_ttl()
            THEN 'expired_pending'
        ELSE p_status
    END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bs_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    recipient_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    user_low uuid GENERATED ALWAYS AS (
        LEAST(initiator_user_id, recipient_user_id)
    ) STORED,
    user_high uuid GENERATED ALWAYS AS (
        GREATEST(initiator_user_id, recipient_user_id)
    ) STORED,
    status text NOT NULL CHECK (
        status IN ('pending', 'accepted', 'declined', 'blocked', 'disconnected')
    ),
    blocked_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    declined_at timestamptz,
    blocked_at timestamptz,
    disconnected_at timestamptz,
    CONSTRAINT bs_connections_no_self CHECK (initiator_user_id <> recipient_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS bs_connections_pair_uniq
    ON public.bs_connections (user_low, user_high);

CREATE INDEX IF NOT EXISTS idx_bs_connections_pending_created
    ON public.bs_connections (created_at)
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.bs_connections_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    connection_id uuid REFERENCES public.bs_connections (id) ON DELETE SET NULL,
    actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    other_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bs_connections_audit_rate_limit
    ON public.bs_connections_audit (actor_user_id, event_type, created_at DESC);

ALTER TABLE public.bs_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bs_connections_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY bs_connections_select_own ON public.bs_connections
    FOR SELECT
    USING (
        (auth.uid() = initiator_user_id OR auth.uid() = recipient_user_id)
        AND NOT (
            status = 'blocked'
            AND blocked_by_user_id IS DISTINCT FROM auth.uid()
        )
    );

CREATE POLICY bs_connections_audit_select_own ON public.bs_connections_audit
    FOR SELECT
    USING (auth.uid() = actor_user_id OR auth.uid() = other_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bs_connections;
ALTER TABLE public.bs_connections REPLICA IDENTITY FULL;

-- Profile search indexes (discoverability column added in follow-on migration)
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_trgm
    ON public.user_profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name_trgm
    ON public.user_profiles USING gin (display_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.connections_assert_request_rate_limit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_count integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT count(*)::integer INTO v_count
    FROM public.bs_connections_audit a
    WHERE a.actor_user_id = v_uid
      AND a.event_type = 'requested'
      AND a.created_at > now() - interval '24 hours';

    IF v_count >= 10 THEN
        RAISE EXCEPTION 'connection request rate limit exceeded';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_write_audit(
    p_event_type text,
    p_connection_id uuid,
    p_other_user_id uuid,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.bs_connections_audit (
        event_type,
        connection_id,
        actor_user_id,
        other_user_id,
        metadata
    )
    VALUES (
        p_event_type,
        p_connection_id,
        auth.uid(),
        p_other_user_id,
        COALESCE(p_metadata, '{}'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_is_pair_blocked(
    p_user_a uuid,
    p_user_b uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.bs_connections c
        WHERE c.user_low = LEAST(p_user_a, p_user_b)
          AND c.user_high = GREATEST(p_user_a, p_user_b)
          AND c.status = 'blocked'
    );
$$;

-- ---------------------------------------------------------------------------
-- connections_request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connections_request(p_recipient_user_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    effective_status text,
    initiator_user_id uuid,
    recipient_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
    v_eff text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF p_recipient_user_id IS NULL THEN
        RAISE EXCEPTION 'recipient_user_id is required';
    END IF;

    IF p_recipient_user_id = v_uid THEN
        RAISE EXCEPTION 'cannot connect with yourself';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_recipient_user_id) THEN
        RAISE EXCEPTION 'recipient user not found';
    END IF;

    IF public.connections_is_pair_blocked(v_uid, p_recipient_user_id) THEN
        RAISE EXCEPTION 'connection not allowed';
    END IF;

    PERFORM public.connections_assert_request_rate_limit();

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.user_low = LEAST(v_uid, p_recipient_user_id)
      AND c.user_high = GREATEST(v_uid, p_recipient_user_id)
    FOR UPDATE;

    IF FOUND THEN
        v_eff := public.connections_effective_status(v_row.status, v_row.created_at);

        IF v_row.status = 'blocked' THEN
            RAISE EXCEPTION 'connection not allowed';
        END IF;

        IF v_row.status = 'accepted' THEN
            RAISE EXCEPTION 'already connected';
        END IF;

        IF v_row.status = 'pending' THEN
            IF v_eff = 'expired_pending' AND v_row.initiator_user_id = v_uid THEN
                UPDATE public.bs_connections c
                SET created_at = now()
                WHERE c.id = v_row.id
                RETURNING * INTO v_row;
                PERFORM public.connections_write_audit(
                    'requested', v_row.id, p_recipient_user_id, '{"renewed_expired_pending":true}'::jsonb
                );
                RETURN QUERY
                SELECT
                    v_row.id,
                    v_row.status,
                    public.connections_effective_status(v_row.status, v_row.created_at),
                    v_row.initiator_user_id,
                    v_row.recipient_user_id;
                RETURN;
            END IF;

            IF v_row.recipient_user_id = v_uid THEN
                UPDATE public.bs_connections c
                SET
                    status = 'accepted',
                    accepted_at = now(),
                    declined_at = NULL,
                    blocked_at = NULL,
                    disconnected_at = NULL,
                    blocked_by_user_id = NULL
                WHERE c.id = v_row.id
                RETURNING * INTO v_row;
                PERFORM public.connections_write_audit(
                    'accepted', v_row.id, p_recipient_user_id, '{"auto_accept":true}'::jsonb
                );
                RETURN QUERY
                SELECT
                    v_row.id,
                    v_row.status,
                    public.connections_effective_status(v_row.status, v_row.created_at),
                    v_row.initiator_user_id,
                    v_row.recipient_user_id;
                RETURN;
            END IF;

            RAISE EXCEPTION 'connection request already pending';
        END IF;

        IF v_row.status = 'declined' THEN
            IF v_row.initiator_user_id = v_uid THEN
                RAISE EXCEPTION 'connection request was declined';
            END IF;

            UPDATE public.bs_connections c
            SET
                initiator_user_id = v_uid,
                recipient_user_id = p_recipient_user_id,
                status = 'pending',
                created_at = now(),
                accepted_at = NULL,
                declined_at = NULL,
                blocked_at = NULL,
                disconnected_at = NULL,
                blocked_by_user_id = NULL
            WHERE c.id = v_row.id
            RETURNING * INTO v_row;
            PERFORM public.connections_write_audit('requested', v_row.id, p_recipient_user_id);
            RETURN QUERY
            SELECT
                v_row.id,
                v_row.status,
                public.connections_effective_status(v_row.status, v_row.created_at),
                v_row.initiator_user_id,
                v_row.recipient_user_id;
            RETURN;
        END IF;

        IF v_row.status = 'disconnected' THEN
            UPDATE public.bs_connections c
            SET
                initiator_user_id = v_uid,
                recipient_user_id = p_recipient_user_id,
                status = 'pending',
                created_at = now(),
                accepted_at = NULL,
                declined_at = NULL,
                blocked_at = NULL,
                disconnected_at = NULL,
                blocked_by_user_id = NULL
            WHERE c.id = v_row.id
            RETURNING * INTO v_row;
            PERFORM public.connections_write_audit('requested', v_row.id, p_recipient_user_id);
            RETURN QUERY
            SELECT
                v_row.id,
                v_row.status,
                public.connections_effective_status(v_row.status, v_row.created_at),
                v_row.initiator_user_id,
                v_row.recipient_user_id;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.bs_connections (
        initiator_user_id,
        recipient_user_id,
        status,
        created_at
    )
    VALUES (v_uid, p_recipient_user_id, 'pending', now())
    ON CONFLICT (user_low, user_high) DO UPDATE
    SET
        initiator_user_id = EXCLUDED.initiator_user_id,
        recipient_user_id = EXCLUDED.recipient_user_id,
        status = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.status
            WHEN public.bs_connections.status = 'pending'
                 AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
                THEN 'accepted'
            ELSE EXCLUDED.status
        END,
        created_at = EXCLUDED.created_at,
        accepted_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.accepted_at
            WHEN public.bs_connections.status = 'pending'
                 AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
                THEN now()
            ELSE public.bs_connections.accepted_at
        END,
        declined_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.declined_at
            ELSE NULL
        END,
        blocked_at = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_at
            ELSE NULL
        END,
        disconnected_at = CASE
            WHEN public.bs_connections.status IN ('blocked', 'accepted', 'declined')
                THEN public.bs_connections.disconnected_at
            ELSE NULL
        END,
        blocked_by_user_id = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_by_user_id
            ELSE NULL
        END
    WHERE public.bs_connections.status NOT IN ('blocked', 'accepted', 'declined')
       OR (
            public.bs_connections.status = 'pending'
            AND public.bs_connections.recipient_user_id = EXCLUDED.initiator_user_id
       )
    RETURNING * INTO v_row;

    PERFORM public.connections_write_audit(
        CASE WHEN v_row.status = 'accepted' THEN 'accepted' ELSE 'requested' END,
        v_row.id,
        p_recipient_user_id,
        CASE
            WHEN v_row.status = 'accepted' THEN '{"auto_accept":true}'::jsonb
            ELSE '{}'::jsonb
        END
    );

    RETURN QUERY
    SELECT
        v_row.id,
        v_row.status,
        public.connections_effective_status(v_row.status, v_row.created_at),
        v_row.initiator_user_id,
        v_row.recipient_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- accept / decline / block / unblock / disconnect
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connections_accept(p_connection_id uuid)
RETURNS TABLE (
    id uuid,
    status text,
    effective_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.id = p_connection_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'connection not found';
    END IF;

    IF v_row.recipient_user_id <> v_uid THEN
        RAISE EXCEPTION 'only the recipient can accept';
    END IF;

    IF v_row.status <> 'pending' THEN
        RAISE EXCEPTION 'connection is not pending';
    END IF;

    IF public.connections_effective_status(v_row.status, v_row.created_at) = 'expired_pending' THEN
        RAISE EXCEPTION 'connection request has expired';
    END IF;

    UPDATE public.bs_connections c
    SET status = 'accepted', accepted_at = now()
    WHERE c.id = v_row.id
    RETURNING * INTO v_row;

    PERFORM public.connections_write_audit('accepted', v_row.id, v_row.initiator_user_id);

    RETURN QUERY
    SELECT
        v_row.id,
        v_row.status,
        public.connections_effective_status(v_row.status, v_row.created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_decline(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.id = p_connection_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'connection not found';
    END IF;

    IF v_row.recipient_user_id <> v_uid THEN
        RAISE EXCEPTION 'only the recipient can decline';
    END IF;

    IF v_row.status <> 'pending' THEN
        RAISE EXCEPTION 'connection is not pending';
    END IF;

    UPDATE public.bs_connections c
    SET status = 'declined', declined_at = now()
    WHERE c.id = v_row.id;

    PERFORM public.connections_write_audit('declined', v_row.id, v_row.initiator_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_block(p_other_user_id uuid)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF p_other_user_id IS NULL OR p_other_user_id = v_uid THEN
        RAISE EXCEPTION 'invalid user';
    END IF;

    INSERT INTO public.bs_connections (
        initiator_user_id,
        recipient_user_id,
        status,
        blocked_by_user_id,
        blocked_at,
        created_at
    )
    VALUES (v_uid, p_other_user_id, 'blocked', v_uid, now(), now())
    ON CONFLICT (user_low, user_high) DO UPDATE
    SET
        status = 'blocked',
        blocked_by_user_id = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_by_user_id
            ELSE v_uid
        END,
        blocked_at = CASE
            WHEN public.bs_connections.status = 'blocked'
                THEN public.bs_connections.blocked_at
            ELSE now()
        END,
        initiator_user_id = v_uid,
        recipient_user_id = p_other_user_id,
        accepted_at = NULL,
        declined_at = NULL,
        disconnected_at = NULL
    RETURNING * INTO v_row;

    PERFORM public.connections_write_audit('blocked', v_row.id, p_other_user_id);

    RETURN QUERY SELECT v_row.id, v_row.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_unblock(p_other_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.user_low = LEAST(v_uid, p_other_user_id)
      AND c.user_high = GREATEST(v_uid, p_other_user_id)
      AND c.status = 'blocked'
      AND c.blocked_by_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'blocked connection not found';
    END IF;

    PERFORM public.connections_write_audit('unblocked', v_row.id, p_other_user_id);

    DELETE FROM public.bs_connections c WHERE c.id = v_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_disconnect(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
    v_other uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.id = p_connection_id
      AND c.status = 'accepted'
      AND (c.initiator_user_id = v_uid OR c.recipient_user_id = v_uid)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'accepted connection not found';
    END IF;

    v_other := CASE
        WHEN v_row.initiator_user_id = v_uid THEN v_row.recipient_user_id
        ELSE v_row.initiator_user_id
    END;

    UPDATE public.bs_connections c
    SET status = 'disconnected', disconnected_at = now()
    WHERE c.id = v_row.id;

    PERFORM public.connections_write_audit('disconnected', v_row.id, v_other);
END;
$$;

-- ---------------------------------------------------------------------------
-- list / get_status / search
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.connections_list(
    p_status text[] DEFAULT NULL,
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    status text,
    effective_status text,
    initiator_user_id uuid,
    recipient_user_id uuid,
    is_initiator boolean,
    username text,
    display_name text,
    avatar_url text,
    created_at timestamptz,
    accepted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.status,
        public.connections_effective_status(c.status, c.created_at),
        c.initiator_user_id,
        c.recipient_user_id,
        (c.initiator_user_id = v_uid) AS is_initiator,
        p.username,
        p.display_name,
        p.avatar_url,
        c.created_at,
        c.accepted_at
    FROM public.bs_connections c
    LEFT JOIN public.user_profiles p ON p.user_id = CASE
        WHEN c.initiator_user_id = v_uid THEN c.recipient_user_id
        ELSE c.initiator_user_id
    END
    WHERE (c.initiator_user_id = v_uid OR c.recipient_user_id = v_uid)
      AND (
          p_status IS NULL
          OR public.connections_effective_status(c.status, c.created_at) = ANY (p_status)
      )
      -- Belt-and-suspenders with RLS: hide invisible blocks inside SECURITY DEFINER too.
      AND NOT (
          c.status = 'blocked'
          AND c.blocked_by_user_id IS DISTINCT FROM v_uid
          AND (c.initiator_user_id = v_uid OR c.recipient_user_id = v_uid)
      )
    ORDER BY c.created_at DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_get_status(p_other_user_id uuid)
RETURNS TABLE (
    status text,
    effective_status text,
    is_initiator boolean,
    connection_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row public.bs_connections%ROWTYPE;
    v_eff text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    SELECT * INTO v_row
    FROM public.bs_connections c
    WHERE c.user_low = LEAST(v_uid, p_other_user_id)
      AND c.user_high = GREATEST(v_uid, p_other_user_id);

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'none'::text, 'none'::text, false, NULL::uuid;
        RETURN;
    END IF;

    IF v_row.status = 'blocked' AND v_row.blocked_by_user_id IS DISTINCT FROM v_uid THEN
        RETURN QUERY SELECT 'none'::text, 'none'::text, false, NULL::uuid;
        RETURN;
    END IF;

    v_eff := public.connections_effective_status(v_row.status, v_row.created_at);

    RETURN QUERY
    SELECT
        v_row.status,
        v_eff,
        (v_row.initiator_user_id = v_uid),
        v_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.connections_search_users(
    p_query text,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    user_id uuid,
    username text,
    display_name text,
    avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
    v_raw text := btrim(COALESCE(p_query, ''));
    v_q text;
    v_exact text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF length(v_raw) < 2 THEN
        RETURN;
    END IF;

    IF left(v_raw, 1) = '@' THEN
        v_raw := btrim(substring(v_raw from 2));
    END IF;

    IF length(v_raw) < 2 THEN
        RETURN;
    END IF;

    v_exact := lower(v_raw);
    v_q := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

    RETURN QUERY
    SELECT
        p.user_id,
        p.username,
        p.display_name,
        p.avatar_url
    FROM public.user_profiles p
    WHERE p.user_id <> v_uid
      AND (
          lower(p.username) = v_exact
          OR (
              COALESCE(p.is_discoverable, true) = true
              AND (
                  p.username ILIKE v_q || '%' ESCAPE '\'
                  OR p.display_name ILIKE '%' || v_q || '%' ESCAPE '\'
                  OR p.username % v_raw
                  OR p.display_name % v_raw
              )
          )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.bs_connections c
          WHERE c.user_low = LEAST(v_uid, p.user_id)
            AND c.user_high = GREATEST(v_uid, p.user_id)
            AND c.status = 'blocked'
      )
    ORDER BY
        CASE WHEN lower(p.username) = v_exact THEN 0
             WHEN p.username ILIKE v_q || '%' ESCAPE '\' THEN 1
             ELSE 2
        END,
        p.username
    LIMIT v_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.bs_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.bs_connections_audit FROM PUBLIC;
GRANT SELECT ON TABLE public.bs_connections TO authenticated;
GRANT SELECT ON TABLE public.bs_connections_audit TO authenticated;

REVOKE ALL ON FUNCTION public.connections_pending_ttl() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connections_effective_status(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connections_assert_request_rate_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connections_write_audit(text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connections_is_pair_blocked(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.connections_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_accept(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_decline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_block(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_unblock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_disconnect(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_list(text[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_get_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connections_search_users(text, integer) TO authenticated;
