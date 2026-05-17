# Mobile app (Expo)

Most scripts run from the **repository root** (`npm run mobile`, etc.). See [`docs/guides/MOBILE.md`](../../docs/guides/MOBILE.md).

## Local Supabase schema

Database migrations live only under **`supabase/migrations/`** at the repo root. From the Beaker Stack checkout root, run `supabase start`, `supabase migration new …`, and `supabase db reset` — do not expect duplicated `.sql` files under [`supabase/migrations/`](./supabase/migrations/) (see the policy note there).

Optional [`supabase/config.toml`](./supabase/config.toml) here keeps mobile-oriented auth redirect URLs separate from the root config; it is not the source of migration SQL.
