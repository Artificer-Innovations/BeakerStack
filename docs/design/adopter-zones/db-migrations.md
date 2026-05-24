# Adopter database migrations

## Layout

| Path                     | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `supabase/migrations/`   | Template schema (`public`, etc.)                                  |
| `adopter/db/init.sql`    | Bootstrap: `CREATE SCHEMA app`, `adopter.schema_migrations` table |
| `adopter/db/migrations/` | Adopter DDL in schema `app`                                       |

## Filename convention

Adopter migrations use normal timestamps (`20260524120000_description.sql`). Separate directory + tracking table provides isolation — a `9*` prefix is **not required** for ordering.

Adopter migrations _may_ optionally use `9*` prefixes as a visual hint in `adopter/db/migrations/`.

## Why template migrations must NOT use `9*` prefix

| Scenario                | Rationale                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Accidental misplacement | Contributor adds adopter DDL to `supabase/migrations/`; `9*` makes review and lint catch "adopter namespace" immediately                    |
| Future unified tooling  | Planned `db:status` / upgrade checklists may scan both dirs in one sorted list; reserved `9*` on template side prevents ambiguous filenames |
| Human convention        | Blocking `9*` on template side keeps adopter-only `9*` convention one-directional                                                           |

## `db:init-adopter`

Idempotent bootstrap — creates `app` schema and `adopter.schema_migrations` tracking table.

```bash
npm run db:init-adopter
```

## `db:apply-adopter` algorithm

1. List `adopter/db/migrations/*.sql` sorted lexicographically
2. Query `adopter.schema_migrations` for applied filenames
3. Apply each pending file in a transaction; record filename + checksum on success
4. On failure: abort, leave DB at last good migration, print failed file + error

### Local / CI

```bash
npm run db:init-adopter
npm run db:apply-adopter
```

### Production (`--linked`)

```bash
supabase db push
npm run db:apply-adopter -- --linked
```

`--linked` resolves connection via `supabase db remote connection-string`, using `DATABASE_URL` / `SUPABASE_DB_PASSWORD` from CI secrets.

## Type generation

```bash
supabase gen types typescript --schema app > adopter/db/types/database.ts
```

## Failure modes

- Missing `db:init-adopter`: runner fails with clear message to run init first
- Partial apply: DB left at last successful migration; re-run applies pending only
- Checksum mismatch on applied file: fail with manual intervention message
