# Customizing BeakerStack

BeakerStack separates **template** code (shared infrastructure, auth, billing shell) from **adopter** code (your product identity, landing, dashboard, billing catalog). Forks customize the `adopter/` tree; upstream template merges skip adopter files via `.gitattributes` (`merge=ours`).

## Zone map

| Zone                  | Path               | Owns                                                                 | Import pattern                                                                                     |
| --------------------- | ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Adopter config**    | `adopter/config/`  | Branding, legal, billing plans, waitlist, landing copy, app identity | Static `import { … } from '@adopter/config/…'` in apps; runtime via `getAdopterConfig()` in shared |
| **Adopter content**   | `adopter/content/` | Terms, privacy, refunds markdown                                     | Built to `packages/shared/src/generated/policies.ts`                                               |
| **Adopter assets**    | `adopter/assets/`  | Icons, landing images                                                | Referenced from landing config                                                                     |
| **Adopter web UI**    | `adopter/web/`     | Dashboard page, route extensions, demo hooks                         | Registered through seam files only                                                                 |
| **Adopter mobile UI** | `adopter/mobile/`  | Dashboard screen, stack screen extensions                            | Registered through seam files only                                                                 |
| **Adopter DB**        | `adopter/db/`      | App-schema migrations (`app.*`)                                      | `npm run db:init-adopter`, `npm run db:apply-adopter`                                              |
| **Template web**      | `apps/web/src/`    | Auth, billing pages, admin, landing _shell_                          | May import `@adopter/config/*`; must not import `@adopter/web/*` except seams                      |
| **Template mobile**   | `apps/mobile/src/` | Navigation shell, billing screens, home                              | May import `@adopter/config/*`                                                                     |
| **Shared**            | `packages/shared/` | Auth, headers, adopter runtime                                       | `configureAdopter()` / `getAdopterConfig()` — **no** `@adopter/*` imports                          |

## Extension seams (only these may import `@adopter/web/*` or `@adopter/mobile/*`)

| File                                          | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `apps/web/src/main.tsx`                       | `configureAdopter(adopterConfig)` before render |
| `apps/web/scripts/prerender-home.ts`          | Prerender with adopter branding/landing         |
| `apps/web/src/App.tsx`                        | `adopterRouteExtensions` routes                 |
| `apps/mobile/src/navigation/AppNavigator.tsx` | `adopterStackScreens` registration              |
| `apps/mobile/App.tsx`                         | `configureAdopter()` + `billingConfig` provider |

ESLint `no-restricted-imports` blocks `@adopter/*` elsewhere (e.g. `packages/shared`).

## Runtime config

```ts
// apps/web/src/main.tsx & apps/mobile/App.tsx
import { configureAdopter } from '@beakerstack/shared/config/adopterRuntime';
import { adopterConfig } from '@adopter/config';

configureAdopter(adopterConfig);

// Anywhere in shared/template after boot:
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';

const { branding, legal, postLoginPath, postLoginPathMobile } =
  getAdopterConfig();
```

`postLoginPath` (web, e.g. `/dashboard`) and `postLoginPathMobile` (React Navigation screen name, e.g. `Dashboard`) drive post-auth redirects.

## Static config modules

| Module                     | Export                       | Used for                       |
| -------------------------- | ---------------------------- | ------------------------------ |
| `@adopter/config`          | `adopterConfig`              | Boot-time `configureAdopter()` |
| `@adopter/config/branding` | `branding`, `brandNameRegex` | Vite meta, build scripts       |
| `@adopter/config/legal`    | `legal`                      | Policy build, footers          |
| `@adopter/config/landing`  | `landingConfig`              | Marketing pages                |
| `@adopter/config/billing`  | `billingConfig`              | Plans, features, Stripe sync   |
| `@adopter/config/waitlist` | `waitlistConfig`             | Waitlist capture, invite email |

## Typical customization workflow

1. Edit `adopter/config/branding.ts`, `legal.ts`, `landing.ts`.
2. Replace assets under `adopter/assets/`.
3. Adjust `adopter/config/billing.ts` plan IDs/features; run `npm run billing:sync-stripe` and `npm run billing:apply-plans`.
4. Customize dashboard in `adopter/web/pages/DashboardPage.tsx` and `adopter/mobile/screens/DashboardScreen.tsx`.
5. Add routes/screens via `adopter/web/routeExtensions.tsx` and `adopter/mobile/screenExtensions.tsx`.
6. Add DDL under `adopter/db/migrations/`; apply with `npm run db:apply-adopter`.

## Merge behavior

`adopter/** merge=ours` in `.gitattributes` keeps your fork's adopter tree during upstream merges. Template changes outside `adopter/` merge normally.

## Further reading

- [AdopterConfig schema](design/adopter-zones/adopter-config.md)
- [Build-time vs runtime config](design/adopter-zones/build-time-config.md)
- [Extension slots](design/adopter-zones/extension-slots.md)
- [Adopter DB migrations](design/adopter-zones/db-migrations.md)
