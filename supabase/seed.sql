-- Seed data for local development
-- This file contains basic test data for the Beaker Stack

-- Billing template product + plans (ids must match apps/web billing config)
INSERT INTO public.billing_products (id, display_name, description)
VALUES (
    'beakerstack',
    'Beaker Stack',
    'Template billing demo product'
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

INSERT INTO public.billing_plans (
    id, product_id, display_name, description, price_cents, billing_period,
    stripe_price_id_monthly, stripe_price_id_annual, stripe_product_id, features, usage_limits, trial_period_days,
    is_public, display_order
)
VALUES
(
    'beakerstack_free',
    'beakerstack',
    'Free',
    'Starter',
    0,
    'free',
    NULL,
    NULL,
    NULL,
    '{"containers_per_account_max": 2, "items_per_container_max": 3, "feature_a": false, "feature_b": false}'::jsonb,
    '{"ai_summarize": 30}'::jsonb,
    0,
    true,
    1
),
(
    'beakerstack_pro',
    'beakerstack',
    'Pro',
    'More capacity',
    1900,
    'monthly',
    NULL,
    NULL,
    NULL,
    '{"containers_per_account_max": -1, "items_per_container_max": 25, "feature_a": true, "feature_b": false}'::jsonb,
    '{"ai_summarize": 500}'::jsonb,
    0,
    true,
    2
),
(
    'beakerstack_max',
    'beakerstack',
    'Max',
    'Everything',
    4900,
    'monthly',
    NULL,
    NULL,
    NULL,
    '{"containers_per_account_max": -1, "items_per_container_max": -1, "feature_a": true, "feature_b": true, "feature_c": true}'::jsonb,
    '{"ai_summarize": -1}'::jsonb,
    5,
    true,
    3
)
ON CONFLICT (id) DO NOTHING;

-- Local dev: allow template demo RPCs (never enable in production revenue DB)
UPDATE public.billing_system_flags SET value = true WHERE key = 'demo_billing_mode';

SELECT 'Seed data loaded successfully' AS status;