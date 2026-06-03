# Beaker Stack Connections v1

**Mutual user-to-user connections for BeakerStack products.**

_Version 1.0_

> **Status:** Implemented in `@beakerstack/connections` and `supabase/migrations/*_bs_connections_v1.sql`.

---

## Purpose

`@beakerstack/connections` provides discoverability, request/accept/decline, block/unblock, and disconnect for authenticated users in Beaker Stack template apps (and other factory products). Product-specific sharing features should call `connections_get_status` from their own packages; this module does not define domain sharing tables.

## Scope

### In scope

- `public.bs_connections` + `public.bs_connections_audit`
- Nine `connections_*` RPCs (`SECURITY DEFINER`, `authenticated` only)
- Lazy pending TTL (30 days), `effective_status` on read RPCs
- Profile `connection_discoverability` enum: `searchable` | `username_only` | `hidden` (template migration)
- React hooks + web UI primitives; template `/connections` page

### Out of scope

- Domain-specific sharing (namespaces, documents, etc.), MCP integrations, email notifications, `connections_list_pending_for_sharing`, automatic share revoke on disconnect (product hooks)

---

## Schema

### `public.bs_connections`

| Column                                                        | Type                  | Notes                                                        |
| ------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| `id`                                                          | uuid PK               |                                                              |
| `initiator_user_id`                                           | uuid FK auth.users    | Who sent the current request                                 |
| `recipient_user_id`                                           | uuid FK auth.users    |                                                              |
| `user_low`                                                    | uuid GENERATED STORED | `LEAST(initiator, recipient)`                                |
| `user_high`                                                   | uuid GENERATED STORED | `GREATEST(...)`                                              |
| `status`                                                      | text                  | `pending`, `accepted`, `declined`, `blocked`, `disconnected` |
| `blocked_by_user_id`                                          | uuid null             | Set when `status = blocked`                                  |
| `created_at`                                                  | timestamptz           | Pending clock for TTL                                        |
| `accepted_at`, `declined_at`, `blocked_at`, `disconnected_at` | timestamptz null      |                                                              |

Constraints: `initiator <> recipient`; unique `(user_low, user_high)`.

### `public.bs_connections_audit`

Append-only: `event_type`, `connection_id`, `actor_user_id`, `other_user_id`, `metadata`, `created_at`. Rate limits count `event_type = 'requested'` in last 24h (max **10** per actor).

### Helpers

- `connections_pending_ttl()` → `interval '30 days'`
- `connections_effective_status(status, created_at)` → `expired_pending` when pending and past TTL

---

## State machine

**Stored:** `pending | accepted | declined | blocked | disconnected`

**Derived:** `effective_status` — pending past TTL → `expired_pending`

| From                              | `connections_request`                           |
| --------------------------------- | ----------------------------------------------- |
| none                              | INSERT `pending`                                |
| pending (live), same initiator    | Error duplicate                                 |
| pending (expired), same initiator | UPDATE `created_at`                             |
| pending, caller is recipient      | Auto-accept                                     |
| declined, original initiator      | Error                                           |
| declined, original recipient      | Flip initiator → `pending`                      |
| disconnected                      | Either party → UPDATE `pending`                 |
| blocked                           | Error (blocked party sees `none` in get_status) |
| accepted                          | Error already connected                         |

**Unblock:** DELETE row. **Disconnect:** `disconnected`, row retained.

**`connections_get_status`:** If other party blocked caller → return `none` (invisible block).

**Mutual race:** `INSERT … ON CONFLICT (user_low, user_high) DO UPDATE` — if existing `pending` and caller is `recipient_user_id`, auto-accept.

**Hidden discoverability vs mutual accept:** `connections_request` checks `connection_discoverability = hidden` before the existing-row `FOR UPDATE` select. If the recipient later sets themselves `hidden` while a pending outbound request exists, the initiator cannot use `connections_request` for the mutual-accept shortcut — they get `user does not accept connection requests`. Use `connections_accept(connection_id)` instead (unchanged and correct).

---

## RPCs

| RPC                                   | Grants                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `connections_request(uuid)`           | authenticated                                                                                                         |
| `connections_accept(uuid)`            | authenticated                                                                                                         |
| `connections_decline(uuid)`           | authenticated                                                                                                         |
| `connections_block(uuid)`             | authenticated                                                                                                         |
| `connections_unblock(uuid)`           | authenticated                                                                                                         |
| `connections_disconnect(uuid)`        | authenticated                                                                                                         |
| `connections_list(text[], int, int)`  | authenticated; cap limit 100                                                                                          |
| `connections_get_status(uuid)`        | authenticated                                                                                                         |
| `connections_search_users(text, int)` | authenticated; cap limit 50; pg_trgm; `searchable` = fuzzy; `username_only` = exact username only; `hidden` = omitted |
| `connections_request(uuid)`           | rejects recipients with `connection_discoverability = hidden`                                                         |

Realtime: `bs_connections` in `supabase_realtime`, `REPLICA IDENTITY FULL`.

---

## Package surface

- `@beakerstack/connections` — types, Zod, client, hooks
- `@beakerstack/connections/web` — UI panels
- `@beakerstack/connections/client` — `'use client'` re-export
- `@beakerstack/connections/native` — RN stub

Adopter apps should import **only** public package exports.
