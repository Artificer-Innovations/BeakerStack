/** Admin/client input — no grantedBy (server sets it on store). */
export type WaitlistCompIntentInput = {
  kind: 'billing_comp';
  planId: string;
  reason: string;
};

export type WaitlistPlanIntentInput = {
  kind: 'billing_plan';
  planId: string;
};

export type WaitlistProvisioningIntentInput =
  | WaitlistCompIntentInput
  | WaitlistPlanIntentInput;

/** Stored on entry metadata after admin RPC. */
export type WaitlistProvisioningIntent =
  | {
      kind: 'billing_comp';
      planId: string;
      reason: string;
      grantedBy: string | null;
    }
  | { kind: 'billing_plan'; planId: string };

export function isWaitlistCompIntentInput(
  intent: WaitlistProvisioningIntentInput
): intent is WaitlistCompIntentInput {
  return intent.kind === 'billing_comp';
}

export function parseStoredProvisioningIntent(
  metadata: Record<string, unknown> | null | undefined
): WaitlistProvisioningIntent | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata['provisioning_intent'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const kind = (raw as { kind?: unknown }).kind;
  const planId = (raw as { planId?: unknown }).planId;
  if (kind !== 'billing_comp' && kind !== 'billing_plan') return null;
  if (typeof planId !== 'string' || planId.length === 0) return null;

  if (kind === 'billing_plan') {
    return { kind: 'billing_plan', planId };
  }

  const reason = (raw as { reason?: unknown }).reason;
  const grantedBy = (raw as { grantedBy?: unknown }).grantedBy;
  if (typeof reason !== 'string' || reason.trim().length === 0) return null;

  return {
    kind: 'billing_comp',
    planId,
    reason,
    grantedBy:
      typeof grantedBy === 'string' && grantedBy.length > 0 ? grantedBy : null,
  };
}

export function toRpcProvisioningIntent(
  intent: WaitlistProvisioningIntentInput | null
): Record<string, unknown> | null {
  if (!intent) return null;
  if (intent.kind === 'billing_comp') {
    return {
      kind: 'billing_comp',
      planId: intent.planId,
      reason: intent.reason.trim(),
    };
  }
  return { kind: 'billing_plan', planId: intent.planId };
}
