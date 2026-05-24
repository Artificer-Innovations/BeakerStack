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
npm run db:apply-adopter -- --linked   # production via supabase db remote connection-string
```

## Filename convention

Use normal timestamps: `20260524120000_description.sql`.

A `9*` prefix is **optional** for adopter migrations (visual hint only). Template migrations in `supabase/migrations/` must **not** use a `9` leading digit.

## Production credentials

`--linked` uses `supabase db remote connection-string` with:

- `SUPABASE_ACCESS_TOKEN`
- Project ref secret (`STAGING_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_PROJECT_REF`, etc.)
- `SUPABASE_DB_PASSWORD` or environment-specific `*_SUPABASE_DB_PASSWORD`

Run after `supabase db push` in deploy workflows.
