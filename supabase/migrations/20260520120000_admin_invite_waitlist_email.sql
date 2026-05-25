-- Admin: create or refresh an invite for an email (no public waitlist submission required).

CREATE OR REPLACE FUNCTION public.admin_invite_waitlist_email(
    p_email text,
    p_metadata jsonb DEFAULT '{}'::jsonb
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
BEGIN
    IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    v_email := lower(trim(p_email));
    IF NOT public.is_valid_email(v_email) THEN
        RETURN jsonb_build_object('error', 'invalid_email');
    END IF;

    SELECT * INTO v_entry FROM public.waitlist_entries WHERE email = v_email FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.waitlist_entries (email, metadata)
        VALUES (
            v_email,
            jsonb_build_object('source', 'admin_invite') || COALESCE(p_metadata, '{}'::jsonb)
        )
        RETURNING * INTO v_entry;
        v_created := true;
    ELSIF v_entry.status = 'converted' THEN
        RETURN jsonb_build_object('error', 'already_converted');
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
        jsonb_build_object('email', v_email, 'created', v_created)
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

REVOKE ALL ON FUNCTION public.admin_invite_waitlist_email(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_invite_waitlist_email(text, jsonb) TO authenticated;
