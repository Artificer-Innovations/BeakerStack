-- Phase 5a: Admin RPCs for marketing_email_settings management.
-- Provides read/write access to marketing email configuration and
-- read-only access to sync queue statistics. All RPCs are admin-gated.

-- ---------------------------------------------------------------------------
-- admin_get_marketing_email_settings
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_marketing_email_settings(
  p_product_id text DEFAULT 'beakerstack'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.marketing_email_settings;
BEGIN
  IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT * INTO v_row
  FROM public.marketing_email_settings
  WHERE product_id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'settings', NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'settings', jsonb_build_object(
      'product_id',  v_row.product_id,
      'enabled',     v_row.enabled,
      'provider',    v_row.provider,
      'config',      v_row.config,
      'updated_at',  v_row.updated_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_marketing_email_settings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_marketing_email_settings(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_update_marketing_email_settings
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_marketing_email_settings(
  p_product_id text,
  p_enabled    boolean,
  p_config     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_namespace text;
  v_form_id   text;
BEGIN
  IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Validate required config fields.
  v_namespace := trim(p_config->>'namespace');
  v_form_id   := trim(p_config->>'kitFormId');

  IF v_namespace IS NULL OR v_namespace = '' THEN
    RETURN jsonb_build_object('error', 'invalid_namespace');
  END IF;

  IF v_namespace !~ '^[a-z][a-z0-9-]*$' THEN
    RETURN jsonb_build_object('error', 'invalid_namespace');
  END IF;

  IF v_form_id IS NULL OR v_form_id = '' THEN
    RETURN jsonb_build_object('error', 'invalid_kit_form_id');
  END IF;

  -- Enforce at-most-one-enabled: disable all other rows before enabling.
  IF p_enabled THEN
    UPDATE public.marketing_email_settings
    SET enabled = false, updated_at = now()
    WHERE product_id != p_product_id AND enabled = true;
  END IF;

  -- Upsert the target row.
  INSERT INTO public.marketing_email_settings (product_id, enabled, provider, config)
  VALUES (p_product_id, p_enabled, 'kit', p_config)
  ON CONFLICT (product_id) DO UPDATE
    SET enabled    = EXCLUDED.enabled,
        config     = EXCLUDED.config,
        updated_at = now();

  -- Audit the change.
  PERFORM public._admin_insert_audit(
    v_uid,
    'admin.marketing_email.settings.update',
    'marketing_email_settings',
    p_product_id,
    jsonb_build_object(
      'enabled',      p_enabled,
      'namespace',    v_namespace,
      'kitFormId',    v_form_id,
      'tierTagNames', COALESCE(p_config->'tierTagNames', '[]'::jsonb)
    )
  );

  RETURN public.admin_get_marketing_email_settings(p_product_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_marketing_email_settings(text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_marketing_email_settings(text, boolean, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_marketing_email_queue_stats
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_marketing_email_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.admin_is_admin() THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'pending',    COUNT(*) FILTER (WHERE status = 'pending'),
      'processing', COUNT(*) FILTER (WHERE status = 'processing'),
      'done',       COUNT(*) FILTER (WHERE status = 'done'),
      'failed',     COUNT(*) FILTER (WHERE status = 'failed')
    )
    FROM public.marketing_email_sync_queue
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_marketing_email_queue_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_marketing_email_queue_stats() TO authenticated;
