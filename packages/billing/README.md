# @beakerstack/billing

Reusable **Supabase + Stripe** billing: entitlements (plan `features` / `usage_limits`), usage RPCs, hooks, and platform UI.

## Imports

- **Shared (types, provider, hooks):** `@beakerstack/billing`
- **Web components:** `@beakerstack/billing/web`
- **React Native components:** `@beakerstack/billing/native`
- **Next.js App Router (client + web UI):** `@beakerstack/billing/client`

This package does **not** embed product tier names, demo RPCs, or domain vocabulary — those live in the app (see `apps/web/src/billing/`).

Design reference: [`docs/specs/beakerstack-billing-v1.md`](../../docs/specs/beakerstack-billing-v1.md) and [`docs/specs/beakerstack-billing-ui-v1.md`](../../docs/specs/beakerstack-billing-ui-v1.md). Setup and QA: [`docs/stripe-billing-setup.md`](../../docs/stripe-billing-setup.md), [`apps/web/docs/billing-testing.md`](../../apps/web/docs/billing-testing.md).

## Config typing

```ts
import {
  defineBillingConfig,
  type InferFeatureKeys,
} from '@beakerstack/billing';

export const myConfig = defineBillingConfig({
  productId: 'my_product',
  displayName: 'My product',
  plans: [
    {
      id: 'my_free',
      displayName: 'Free',
      priceCents: 0,
      billingPeriod: 'free',
      features: { fancy: false },
      usageLimits: { api_calls: 100 },
    },
  ],
});

export type MyFeature = InferFeatureKeys<typeof myConfig>;
```

Invalid feature keys passed to `useFeature` should fail **TypeScript** when hooks are used with `typeof myConfig`.

## Next.js note

`@beakerstack/billing/client` begins with `'use client'` and re-exports hooks plus web components. Tree-shaking and server boundaries should be validated when adding App Router pages.
