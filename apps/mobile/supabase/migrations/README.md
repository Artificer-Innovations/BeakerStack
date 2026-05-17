# Schema migrations live at the repository root

SQL migrations are **not** duplicated under this app. Author and apply them only from the Beaker Stack repository root:

- **Directory:** `supabase/migrations/` (relative to repo root)
- **CLI:** Run `supabase start`, `supabase migration new …`, `supabase db reset`, and linked `supabase db push` from the **repository root**, using the root `supabase/config.toml`.

This directory intentionally contains no `.sql` migration files so we avoid drift between copies.
