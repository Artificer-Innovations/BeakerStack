---
name: BeakerStack Dashboard Billing Demo v1
overview: Replace the empty dashboard with an annotated playground that exercises every billing primitive in a clearly-labeled, developer-facing format. Each section demonstrates one capability of @beakerstack/billing with intro copy, working controls, visible state, and a code reference. Demo controls live at the bottom in an explicit "app layer, not package" section. Deliberately reads as a sandbox, not a fake product.
todos:
  - id: dashboard-shell
    content: Replace the existing dashboard placeholder with the new playground layout, framing copy, and section structure
    status: pending
  - id: metered-section
    content: Build the metered usage section with UsageIndicator, simulate button, and visible AI summarize result area
    status: pending
  - id: numeric-caps-section
    content: Build the numeric caps section with collections list, add-collection button, per-collection items list, and add-item buttons
    status: pending
  - id: boolean-gates-section
    content: Build the boolean feature gates section with FeatureGate examples for Feature A and Feature B
    status: pending
  - id: demo-controls
    content: Build the demo controls section at the bottom, gated to VITE_BILLING_DEMO_MODE, with plan switcher and usage reset
    status: pending
  - id: ai-summarize-result
    content: Wire the metered action to produce a visible result (lorem ipsum or Claude API call) into a result area
    status: pending
isProject: false
---

# BeakerStack Dashboard Billing Demo v1

The empty dashboard becomes an annotated playground that exercises every primitive in `@beakerstack/billing`. The polished `/billing/*` pages already prove the stack can produce real-feeling product UI; the dashboard's job is different — it teaches developers how the building blocks compose. The format is deliberately sandbox-like: labeled sections, intro copy, obvious controls, code references. It must NOT look like a fake product.

## 1. Page-level framing

Replace the current dashboard placeholder content. Keep the existing `AppHeader.web` and the `min-h-screen bg-gray-50` page-shell pattern that already wraps authenticated routes. Centered container at `max-w-[800px]` matching profile page width.

**Top of page (above all sections):**

- Page title: "Welcome to BeakerStack" (`text-2xl font-bold`)
- Lede paragraph: 2-3 sentences explaining what this dashboard is. Suggested copy:

  > This dashboard is a sandbox for exercising the billing primitives in `@beakerstack/billing` directly. Each section below demonstrates one capability with working controls and code references. For the polished, production-style billing UI, visit [Billing](/billing).

- Inline links row below the lede:
  - "View polished billing pages →" → `/billing`
  - "Read the integration guide →" → external docs link (use `#` placeholder if no doc exists yet, with a TODO comment)

Sections render below this framing in the order specified in §3.

## 2. Section component pattern

Build a reusable `<DashboardDemoSection>` component (lives in `apps/web/src/components/dashboard/`) used by every section. Props:

```ts
type DashboardDemoSectionProps = {
  title: string; // section heading
  demonstrates: string; // short list of API names being shown
  description: string; // 2-3 sentence intro copy
  codeReference: string; // single-line monospace code reference
  children: React.ReactNode; // the actual interactive controls
  variant?: 'default' | 'demo-mode'; // demo-mode gets a distinct visual treatment
};
```

Visual treatment:

- White card on `bg-gray-50` page background, matching existing card pattern (`rounded-xl border border-gray-200 bg-white p-6`).
- Title: `text-lg font-semibold`.
- "Demonstrates:" label in `text-xs uppercase tracking-wide text-gray-500`, followed by the API names in `text-sm text-gray-700 font-mono`.
- Description: `text-sm text-gray-600 mt-2`.
- Children render in a content area below description with `mt-4`.
- Code reference rendered at the bottom of the card in a small `text-xs font-mono text-gray-500` line, prefixed with `// ` to make it visually distinct as a code comment.
- Sections separated by `space-y-6` in the parent container.
- `demo-mode` variant uses a dashed border (`border-dashed border-gray-300`) and adds a small "Demo mode only" badge in the top-right corner to visually distinguish it from the package-level sections.

## 3. Sections (in render order)

### 3.1 Metered usage

```
title: "Metered usage"
demonstrates: "useUsage, useRecordUsage, UsageIndicator"
description: "The AI summarize action is metered. Free tier allows 30 per
              month; Pro 500; Max unlimited. Usage resets monthly for free
              users and per billing period for paid users."
codeReference: 'useRecordUsage("ai_summarize")'
```

**Children:**

1. `<UsageIndicator meter="ai_summarize" variant="expanded" />` showing current usage, cap, and reset date.
2. A primary button: "Simulate AI summarize". On click:
   - Calls `useRecordUsage("ai_summarize")` callback.
   - If at cap, button shows disabled state with "Limit reached" text and a small "Upgrade" link to `/billing/plans`.
   - On success, appends a fake AI summary result to a result area below the button (see below).
3. **Result area:** below the button, a bordered box with `bg-gray-50` showing the result of the most recent simulate action. Initial state: empty, with placeholder text "Click 'Simulate AI summarize' to generate a result." Each click prepends a new result with a timestamp.

**AI summarize result content:** generate a short lorem-ipsum-style fake summary string (3-5 lines) to make the action feel real without making a real API call by default. Optionally, if `VITE_DEMO_USE_REAL_AI=true` is set, call the Claude API via an Edge Function to generate a real summary. Default to fake content so the demo works without API keys configured. Keep the last 3 results visible; older ones drop off.

### 3.2 Numeric feature caps

```
title: "Numeric feature caps"
demonstrates: "useFeature with numeric values, hierarchical container caps"
description: "Free tier allows 2 collections with 3 items per collection.
              Pro allows unlimited collections with 25 items each. Max
              allows unlimited both. Caps are enforced via useFeature
              returning a numeric value rather than going through usage
              events."
codeReference: 'useFeature("max_collections")'
```

**Children:**

1. Header row: "Collections: N of [limit]" where [limit] is the numeric cap or "∞" for unlimited. Inline button: "Add collection" (primary). Disabled at cap with "Limit reached" tooltip.
2. List of collections (existing data model carries over). Each collection rendered as a small card with:
   - Collection ID (truncated UUID or short label)
   - "Items: M of [limit]"
   - Inline "Add item" button (smaller, secondary). Disabled at cap.
   - Inline "Delete" button (small, destructive icon-only) — needed so users can resolve constraint warnings on the Plans page by deleting collections.
3. If user has zero collections, show empty state: "No collections yet. Click 'Add collection' to start." in `text-sm text-gray-500`.

**Behavior:**

- Adding a collection creates a new entry in the existing `collections` table (or whatever was used in `/billing-demo`) with a generated ID.
- Adding an item creates an entry in the items table linked to that collection.
- Deleting a collection cascades to its items.
- The cap displays update reactively as the user adds/removes; the existing `useFeature` hook should already drive this if the provider re-fetches on mutation. If not, document a manual refresh in code.

### 3.3 Boolean feature gates

```
title: "Boolean feature gates"
demonstrates: "FeatureGate component, useFeature for boolean features"
description: "Feature A unlocks at Pro and above. Feature B unlocks at Max
              only. Each section below shows the FeatureGate behavior at
              your current plan: enabled features render their content;
              disabled features render the fallback."
codeReference: '<FeatureGate feature="feature_a" fallback={...} />'
```

**Children:**

Two stacked sub-blocks, one per feature. Each sub-block contains:

```
Feature A (requires Pro)
[FeatureGate renders one of:]
  Enabled state:  "✓ Feature A is enabled for your plan." (green text, check icon)
  Disabled state: A small inline upgrade prompt — "Feature A requires Pro."
                  with "Upgrade →" link to /billing/plans
```

Same pattern for Feature B (requires Max). Use the existing `FeatureGate` component from `packages/billing` with a custom `fallback` prop containing the upgrade prompt JSX.

Below the two sub-blocks, render a single line showing the imperative-style equivalent for developers who prefer that pattern:

> Imperative equivalent: `const { enabled } = useFeature("feature_a")` → currently `true`/`false`

This mirrors the live state of the gate above and demonstrates that both declarative and imperative patterns are available.

### 3.4 Demo controls (variant: `demo-mode`)

```
title: "Demo controls"
demonstrates: "App-layer demo affordances (NOT in @beakerstack/billing)"
description: "These controls exist only when VITE_BILLING_DEMO_MODE=true and
              demo_billing_mode is enabled in the database. They live in the
              app layer using a service-role RPC and are explicitly NOT part
              of @beakerstack/billing. Production apps should remove this
              section."
codeReference: 'await supabase.rpc("simulate_upgrade", { plan_id })'
```

**Render condition:** entire section hidden unless `import.meta.env.VITE_BILLING_DEMO_MODE === "true"`. When demo mode is off, the section does not render at all (not even greyed out — completely absent).

**Children:**

1. Current plan display: "Current plan: [Free/Pro/Max]" in `text-sm`.
2. Plan switcher: three buttons in a row — "Switch to Free", "Switch to Pro", "Switch to Max". Active plan's button is disabled. Each button calls the `simulate_upgrade` RPC.
3. Reset usage button (separate, secondary styling): "Reset all usage counters". Calls a `reset_usage` RPC that zeros `billing_usage_aggregates` for the current user.
4. Inline note in `text-xs text-gray-500`: "These actions take effect immediately and bypass Stripe. Do not deploy to production."

**Visual distinction:** the `demo-mode` variant of `<DashboardDemoSection>` uses dashed borders and the "Demo mode only" badge to make this section visibly different from the three above. The reader should immediately understand "this is the test panel, not part of the framework."

## 4. Layout summary

```
┌─────────────────────────────────────────────────────┐
│ AppHeader (existing)                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Welcome to BeakerStack                              │
│ [lede paragraph]                                    │
│ [view polished billing →] [integration guide →]    │
│                                                     │
│ ┌─ Metered usage ─────────────────────────────────┐ │
│ │ DEMONSTRATES: useUsage, useRecordUsage, …       │ │
│ │ [description]                                   │ │
│ │ [UsageIndicator]                                │ │
│ │ [Simulate button] [Result area]                 │ │
│ │ // useRecordUsage("ai_summarize")               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Numeric feature caps ──────────────────────────┐ │
│ │ … (similar structure)                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Boolean feature gates ─────────────────────────┐ │
│ │ … (similar structure)                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ╔═ Demo controls (dashed border, demo-mode only) ═╗ │
│ ║ … (plan switcher, reset usage)                  ║ │
│ ╚═════════════════════════════════════════════════╝ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 5. Component inventory

| Component                | Location                             | Purpose                                                                                                    |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `<DashboardDemoSection>` | `apps/web/src/components/dashboard/` | Reusable section wrapper with title, demonstrates, description, code reference, optional demo-mode variant |
| `<MeteredUsageDemo>`     | `apps/web/src/components/dashboard/` | Section 3.1 contents                                                                                       |
| `<NumericCapsDemo>`      | `apps/web/src/components/dashboard/` | Section 3.2 contents                                                                                       |
| `<BooleanGatesDemo>`     | `apps/web/src/components/dashboard/` | Section 3.3 contents                                                                                       |
| `<DemoControlsPanel>`    | `apps/web/src/components/dashboard/` | Section 3.4 contents, env-gated                                                                            |
| `<AISummarizeResult>`    | `apps/web/src/components/dashboard/` | The result area showing the last 3 fake/real summaries with timestamps                                     |

All components use existing `packages/billing` hooks and components for state and gating. No new package-level primitives required for this spec.

## 6. Mobile parity

Mirror the same structure on `apps/mobile/src/screens/DashboardScreen.tsx` using native equivalents. The native version uses a vertical scroll container, native `<TouchableOpacity>` for buttons, and the existing `.native.tsx` versions of billing components. Mobile demo controls live at the bottom of the scroll, same as web.

If mobile parity is non-trivial because some primitives lack native variants, ship web first and document the mobile follow-up.

## 7. Migration

1. Implement the new dashboard playground.
2. Verify all sections render and interact correctly across Free, Pro, and Max plans (use demo controls to switch).
3. Verify demo controls section is fully absent when `VITE_BILLING_DEMO_MODE` is unset.
4. Remove the legacy `/billing-demo` route and `BillingDemoPage` component.
5. Update any in-app links that pointed to `/billing-demo` (likely just the dashboard placeholder, which is being replaced anyway).

## 8. Non-goals

- No analytics or tracking on the demo controls.
- No persistence of fake AI summarize results across sessions; in-memory only.
- No real Claude API integration unless `VITE_DEMO_USE_REAL_AI=true` is explicitly set; default is fake lorem ipsum.
- No additional billing primitives in `packages/billing` for this spec — the dashboard composes existing primitives.
- No styling system or design tokens introduced here; reuse existing Tailwind patterns from profile/billing pages.
- No "tour" or onboarding overlay; the section copy IS the tour.

## 9. Open questions for the agent to flag, not decide

- Does the existing `useFeature` hook return numeric values directly, or does it require a separate accessor? Match whatever exists; do not add new hook signatures for this spec.
- Is there an existing `simulate_upgrade` RPC from earlier work? Reuse if present; if not, propose its schema in the PR. Same for `reset_usage`.
- Where does the lorem-ipsum fake summary content come from? Suggest a small `apps/web/src/lib/fakeAi.ts` module with 5-10 canned summary strings rotated by a counter or random pick.

These are flagged so the agent surfaces decisions in the PR rather than guessing.
