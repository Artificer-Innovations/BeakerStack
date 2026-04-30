# Mobile development (native builds)

Commands below are run from the **repository root** unless noted.

## Day-to-day (from root)

- `npm run mobile` — Expo dev server (default port 8082)
- `npm run mobile:ios` / `npm run mobile:android` — Dev client + simulator/emulator
- `npm run mobile:clean` — Stop Metro/Expo-related processes

## Native rebuilds (from `apps/mobile`)

Use these when native projects are stale, simulators lost the app, or native modules changed.

| Command                                               | When to use                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run ios` / `npm run android`                     | Normal development builds                                                                      |
| `npm run ios:clean` / `npm run android:clean`         | Quick clean when build artifacts are stale                                                     |
| `npm run rebuild` / `npm run rebuild:ios`             | Full clean rebuild (e.g. after deleting the app from the simulator, or stubborn native issues) |
| `npm run rebuild:android`                             | Same for Android                                                                               |
| `npm run ios:uninstall` / `npm run android:uninstall` | Remove the app from booted simulator / connected device before reinstalling                    |
| `npm run prebuild:clean`                              | Regenerate `ios/` and `android/` with Expo prebuild (destructive; review diffs)                |

For EAS builds, dev-client install flows, and CI-driven previews, see [MOBILE_BUILD_TESTING.md](../MOBILE_BUILD_TESTING.md) and [oauth/MOBILE_OAUTH_SETUP.md](../oauth/MOBILE_OAUTH_SETUP.md).

## Local Supabase schema

Database migrations live only under **`supabase/migrations/`** at the repository root. Run `supabase start`, `supabase migration new …`, and `supabase db reset` from the repo root — not only from `apps/mobile`. Details: [`apps/mobile/supabase/migrations/README.md`](../../apps/mobile/supabase/migrations/README.md).
