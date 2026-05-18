-- Structured waitlist signup copy defaults + optional use-case field for painted-door launches

UPDATE public.waitlist_settings
SET
    copy = copy
        || jsonb_build_object(
            'waitlist',
            COALESCE(copy->'waitlist', '{}'::jsonb)
                || jsonb_build_object(
                    'headline', COALESCE(copy #>> '{waitlist,headline}', 'Join the waitlist'),
                    'subhead', COALESCE(
                        copy #>> '{waitlist,subhead}',
                        'We''re rolling out access in batches. Drop your email and we''ll let you know when your spot opens up.'
                    ),
                    'submit_button_label', COALESCE(
                        copy #>> '{waitlist,submit_button_label}',
                        'Join waitlist'
                    ),
                    'footer_note', COALESCE(
                        copy #>> '{waitlist,footer_note}',
                        'No spam. We''ll only email you about your spot.'
                    ),
                    'success_message', COALESCE(
                        copy #>> '{waitlist,success_message}',
                        copy #>> '{waitlist,confirmation}',
                        'Thanks — you''re on the list. We''ll email you when your spot opens up.'
                    ),
                    'confirmation', COALESCE(
                        copy #>> '{waitlist,success_message}',
                        copy #>> '{waitlist,confirmation}',
                        'Thanks — you''re on the list. We''ll email you when your spot opens up.'
                    )
                )
        ),
    metadata_schema = CASE
        WHEN metadata_schema IS NULL
             OR metadata_schema = '[]'::jsonb
        THEN '[{"id":"use_case","label":"What are you hoping to use this for? (optional)","type":"textarea","required":false}]'::jsonb
        ELSE metadata_schema
    END
WHERE id = 1;

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
        v_copy #>> '{waitlist,success_message}',
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

REVOKE ALL ON FUNCTION public.waitlist_capture(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_capture(text, jsonb, text) TO service_role;
