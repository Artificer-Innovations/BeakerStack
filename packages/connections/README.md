# @beakerstack/connections

Mutual user-to-user connections (request, accept, decline, block, disconnect) backed by Supabase RPCs.

## Database

Apply template migrations (in order):

- `supabase/migrations/20260601155900_user_profiles_is_discoverable.sql` (superseded by enum migration below)
- `supabase/migrations/20260601160000_bs_connections_v1.sql`
- `supabase/migrations/20260602130000_connections_search_exact_username.sql`
- `supabase/migrations/20260603140000_connection_discoverability_enum.sql`

Spec: [`docs/specs/beakerstack-connections-v1.md`](../../docs/specs/beakerstack-connections-v1.md)

## Imports

- **Types, client, hooks:** `@beakerstack/connections`
- **Web UI:** `@beakerstack/connections/web`
- **App Router:** `@beakerstack/connections/client`

## Template web app

The demo web app exposes `/connections` (protected) for managing people connections. Profile settings include a discoverability control for connection search.
