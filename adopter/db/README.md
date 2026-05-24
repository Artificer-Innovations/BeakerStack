# Adopter database

Adopter-owned PostgreSQL schema and migrations live here — separate from template `supabase/migrations/`.

## Layout

| Path                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `init.sql`          | Creates `app` schema + `app.schema_migrations` tracking table |
| `migrations/`       | Adopter DDL in schema `app`                                   |
| `types/database.ts` | Generated via `supabase gen types --schema app`               |

## Commands

```bash
npm run db:init-adopter      # idempotent bootstrap
npm run db:apply-adopter     # apply pending migrations locally
npm run db:apply-adopter -- --linked   # remote hosted DB via env secrets
```

## Filename convention

Use normal timestamps: `20260524120000_description.sql`.

A `9*` prefix is **optional** for adopter migrations (visual hint only). Template migrations in `supabase/migrations/` must **not** use a `9` leading digit.

## Production credentials

`--linked` builds a Postgres connection string from environment variables (in priority order):

1. `DATABASE_URL` — explicit override
2. `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD`
3. `SUPABASE_PREVIEW_PROJECT_REF` + `SUPABASE_PREVIEW_DB_PASSWORD`
4. `STAGING_SUPABASE_PROJECT_REF` + `STAGING_SUPABASE_DB_PASSWORD`
5. `PRODUCTION_SUPABASE_PROJECT_REF` + `PRODUCTION_SUPABASE_DB_PASSWORD`
6. Local fallback after `supabase link`: `supabase/.temp/project-ref` + `SUPABASE_DB_PASSWORD` (generic var only — not staging/production/preview variants)

Deploy workflows inject the staging/production project ref and DB password secrets on the adopter migration step (after `supabase link`, which writes `supabase/.temp/pooler-url`). PR preview runs the same step from `scripts/pr-preview/reset-preview-database.sh` after Supabase reset/link (copies link artifacts into `supabase/.temp/` for pooler resolution). When that pooler template exists, `--linked` uses the Supavisor session pooler (IPv4-compatible) instead of the direct `db.{ref}.supabase.co` host. Run after `supabase db push` in deploy workflows.
