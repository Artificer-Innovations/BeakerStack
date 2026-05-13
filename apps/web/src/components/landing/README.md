# Landing page

Config-driven B2C marketing landing page for BeakerStack.

## Rebrand in one file

Edit `src/config/landing.ts`. Every piece of copy, every link, every feature description, every FAQ entry lives there. Swap the config for a completely different product and the page renders correctly with zero JSX changes.

The alternate config at `src/config/landing.example.alt.ts` demonstrates this — it's a different product with different copy that renders using the same section components.

## Config shape

```ts
landingConfig = {
  brand: { name, tagline, logoSrc? }
  nav: { links, signInHref, signUpHref }
  hero: { eyebrow?, headline, subhead, primaryCta, secondaryCta?, mediaSrc, mediaAlt, trustStrip? }
  featureGrid: { heading, subhead, items: [{ icon: LucideIcon, title, body }] }
  featureRows: [{ title, body, ctaLabel, ctaHref, mediaSrc, mediaAlt, mediaSide }]
  socialProof?: { kind: 'testimonials'|'metrics'|'logos', items }
  pricing: { heading, subhead }
  faq: { heading, items: [{ q, a }] }
  finalCta: { headline, subhead, ctaLabel, ctaHref }
  footer: { columns, legalLinks, copyright }
}
```

Optional sections (`socialProof`, `hero.trustStrip`, `hero.eyebrow`, `hero.secondaryCta`) render only when present in the config.

## Icons

Feature grid icons use `lucide-react`. Pass the icon component directly — e.g. `import { Zap } from 'lucide-react'` then `icon: Zap`.

## Landing images

Landing artwork goes in `public/landing/`. Reference it from `src/config/landing.ts` with `publicUrl('landing/example.png')` so Vite's `BASE_URL` is applied for path-prefixed preview deployments.

## Pricing section

`PricingSection` mounts its own `BillingProvider` to display the plan catalog for unauthenticated visitors. It passes `isAuthenticated={false}` to `PricingTable`, which shows "Get started" buttons and routes clicks to `/signup?plan=<planId>`. The `BillingProvider` instance is scoped to this section's subtree — it does not conflict with the authenticated app's `BillingProvider` (the two are never mounted simultaneously).

One trade-off: `BillingProvider` makes a `supabase.auth.getSession()` call and registers an auth listener on every landing page load, even for unauthenticated visitors. This is one network call per page load — acceptable given the plan catalog is the same data structure used throughout the app.
