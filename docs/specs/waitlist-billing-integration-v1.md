# Waitlist–billing integration v1

Factory integration between `@beakerstack/waitlist` and `@beakerstack/billing` for per-invite provisioning at conversion time.

## Package

`@beakerstack/waitlist-billing` — adopter config in [`adopter/config/waitlist-billing.ts`](../../adopter/config/waitlist-billing.ts).

```typescript
{
  productId: 'beakerstack',
  compPlanIds: ['beakerstack_vip'],
  defaultCompPlanId: 'beakerstack_vip',
}
```

## Flow

1. Admin sets `provisioning_intent` on invite/approve (`admin_invite_waitlist_email`, `admin_approve_waitlist_entry`) or retroactively (`admin_set_waitlist_entry_provisioning_intent`).
2. User completes signup; `waitlist_consume_invite` returns `entry_id` + `provisioning_intent` (including OAuth `already_converted`).
3. `waitlist-ops` calls `waitlist_billing_fulfill_conversion` whenever `entry_id` is present.
4. Fallback to `waitlist_settings.default_plan_id` only when fulfill did not apply comp/plan.

## RPCs

| RPC                                            | Role                | Purpose                                           |
| ---------------------------------------------- | ------------------- | ------------------------------------------------- |
| `admin_set_waitlist_entry_provisioning_intent` | authenticated admin | Set/clear intent on `pending` / `approved`        |
| `waitlist_billing_fulfill_conversion`          | service_role        | Read intent from entry; apply comp or public plan |
| `_billing_apply_comp_grant`                    | service_role        | Shared comp grant helper (billing core)           |

## Allowlist

`p_allowed_comp_plan_ids text[]` is passed from adopter TypeScript config at call time. Expanding VIP plans is config-only (no SQL migration).

## Ops CLI

```bash
BEAKERSTACK_ADMIN_EMAIL=... BEAKERSTACK_ADMIN_PASSWORD=... \
  npm run admin:invite -- --email user@example.com --vip --reason "Design partner"

npm run admin:waitlist-vip -- --entry-id <uuid> --vip --reason "Retroactive"
npm run admin:waitlist-vip -- --entry-id <uuid> --clear
```

## Deploy checklist

Keep these in sync when changing VIP comp plans:

| Surface                                                 | Config source                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Admin UI / CLI / `@beakerstack/waitlist-billing` client | `adopter/config/waitlist-billing.ts` → `compPlanIds`                                            |
| `waitlist-ops` edge (`consume` fulfill path)            | Supabase secret / env `WAITLIST_COMP_PLAN_IDS` (comma-separated; defaults to `beakerstack_vip`) |

After adding or renaming a comp plan ID, update **both** places and redeploy the edge function. Mismatch surfaces as `plan_not_allowed` at conversion time while admin invite/approve still succeeds.
