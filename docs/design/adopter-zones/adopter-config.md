# AdopterConfig schema

Runtime configuration injected via `configureAdopter()` from `adopter/config/index.ts`.

## Schema (Zod, `.strip()`)

Unknown keys are stripped so forks with older config shapes survive template adding optional fields.

```ts
{
  branding: BrandingConfig;
  legal: LegalConfig;
  postLoginPath: string; // e.g. '/dashboard'
  postLoginPathMobile: string; // e.g. 'Dashboard' — React Navigation screen name
  // optional fields added by template over time are stripped on older forks, not rejected
}
```

## Two-tier access

| Tier              | Consumers                                     | Mechanism                                             |
| ----------------- | --------------------------------------------- | ----------------------------------------------------- |
| Static modules    | `vite.config.ts`, prerender, landing sections | `import { branding } from '@adopter/config/branding'` |
| Runtime singleton | Shared components, auth redirects             | `getAdopterConfig()`                                  |

## `configureAdopter()` contract

- Called once from `apps/web/src/main.tsx` and mobile `App.tsx` before render.
- Second call warns or throws (Phase 1 AC).
- `getAdopterConfig()` **always throws** when uninitialized — no test-env sniffing.
- Tests use `configureAdopter(TEST_ADOPTER_FIXTURE)` in `packages/shared-tests/setup.adopter.ts`.

## `postLoginPathMobile` startup validation

After loading `adopterStackScreens`, `AppNavigator.tsx` validates:

```ts
const config = getAdopterConfig();
const registered = new Set(adopterStackScreens.map(s => s.name));
if (!registered.has(config.postLoginPathMobile)) {
  throw new Error(
    `postLoginPathMobile "${config.postLoginPathMobile}" is not registered in adopter/mobile/screenExtensions.tsx`
  );
}
```

Fails fast on typos instead of silent `navigate()` no-ops.

## Post-login redirect (web)

Template auth pages read `getAdopterConfig().postLoginPath` — not a separate `@adopter/config/routes` import seam.

Optional Phase 2 follow-up: warn if web `postLoginPath` is not matched by any `adopterRouteExtensions` path.

## Zod bundle size

Zod is already a dependency of `@beakerstack/shared` (~13KB minzipped). The adopter config schema reuses it; no new dependency.
