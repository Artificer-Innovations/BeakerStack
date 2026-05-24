# Build-time vs runtime config

## Pre-render pipeline (unchanged capability)

```
vite build → prerender-home.ts → hydration
```

1. **`vite.config.ts`** — static `@adopter/config/branding` for HTML meta plugin
2. **`adopter/config/landing.ts`** — static export for landing copy and assets
3. **`prerender-home.ts`** — `configureAdopter(adopterConfig)` **before** dynamic imports of `LandingPageSSR` / `AppFooter`

## Prerender guard

ESLint `no-restricted-imports` or dedicated lint script flags static imports in `prerender-home.ts` above the `configureAdopter()` call (except config/runtime modules).

## Marketing acceptance criteria

- Build produces prerendered HTML with `<h1>` smoke check
- Hydration test passes
- No Supabase client at prerender time

## Static vs runtime summary

| File                               | Access pattern                                                |
| ---------------------------------- | ------------------------------------------------------------- |
| `vite.config.ts`                   | Static `@adopter/config/branding`                             |
| `adopter/config/landing.ts`        | Static import by landing sections                             |
| Shared `AppHeader`, auth redirects | `getAdopterConfig()` after `configureAdopter()` in `main.tsx` |
| Mobile `App.tsx`                   | `configureAdopter(adopterConfig)` before navigator mount      |
