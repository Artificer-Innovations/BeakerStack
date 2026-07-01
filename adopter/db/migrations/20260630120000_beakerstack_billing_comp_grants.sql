-- BeakerStack: VIP comp catalog plan (Max-equivalent, operator-granted only).

INSERT INTO public.billing_plans (
    id, product_id, display_name, description, price_cents, billing_period,
    stripe_price_id_monthly, stripe_price_id_annual, stripe_product_id,
    features, usage_limits, trial_period_days, is_public, display_order
)
VALUES (
    'beakerstack_vip',
    'beakerstack',
    'VIP (complimentary)',
    'Complimentary Max-equivalent access (operator-granted only)',
    0,
    'monthly',
    NULL,
    NULL,
    NULL,
    '{"containers_per_account_max": -1, "items_per_container_max": -1, "feature_a": true, "feature_b": true}'::jsonb,
    '{"ai_summarize": -1}'::jsonb,
    0,
    false,
    99
)
ON CONFLICT (id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    billing_period = EXCLUDED.billing_period,
    features = EXCLUDED.features,
    usage_limits = EXCLUDED.usage_limits,
    trial_period_days = EXCLUDED.trial_period_days,
    is_public = EXCLUDED.is_public,
    display_order = EXCLUDED.display_order,
    updated_at = now();
