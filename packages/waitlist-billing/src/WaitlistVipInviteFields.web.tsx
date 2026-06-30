import { useState } from 'react';
import {
  buildCompProvisioningIntent,
  parseStoredProvisioningIntent,
  type WaitlistProvisioningIntentInput,
} from './provisioningHelpers.js';

export type WaitlistVipInviteFieldsProps = {
  defaultCompPlanId: string;
  initialMetadata?: Record<string, unknown> | null;
  disabled?: boolean;
  onChange: (intent: WaitlistProvisioningIntentInput | null) => void;
  onVipEnabledChange?: (enabled: boolean) => void;
};

export function WaitlistVipInviteFields({
  defaultCompPlanId,
  initialMetadata,
  disabled = false,
  onChange,
  onVipEnabledChange,
}: WaitlistVipInviteFieldsProps) {
  const stored = parseStoredProvisioningIntent(initialMetadata ?? undefined);
  const storedComp = stored?.kind === 'billing_comp' ? stored : null;

  const [vipEnabled, setVipEnabled] = useState(Boolean(storedComp));
  const [reason, setReason] = useState(storedComp?.reason ?? '');

  const emitChange = (enabled: boolean, nextReason: string) => {
    if (!enabled) {
      onChange(null);
      return;
    }
    const trimmed = nextReason.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    onChange(buildCompProvisioningIntent(defaultCompPlanId, trimmed));
  };

  const toggleVip = (checked: boolean) => {
    setVipEnabled(checked);
    onVipEnabledChange?.(checked);
    const nextReason = checked ? reason : '';
    if (!checked) {
      setReason('');
    }
    emitChange(checked, nextReason);
  };

  const updateReason = (nextReason: string) => {
    setReason(nextReason);
    emitChange(vipEnabled, nextReason);
  };

  return (
    <div className='space-y-3 rounded-md border border-indigo-100 bg-indigo-50/40 p-3'>
      <label className='flex items-start gap-2'>
        <input
          type='checkbox'
          className='mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
          checked={vipEnabled}
          disabled={disabled}
          onChange={e => toggleVip(e.target.checked)}
        />
        <span>
          <span className='block text-sm font-medium text-gray-900'>
            Grant complimentary VIP on signup
          </span>
          <span className='block text-xs text-gray-600'>
            Applies Max-equivalent comp access when they complete signup.
          </span>
        </span>
      </label>

      {vipEnabled ? (
        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>
            Reason (required)
          </span>
          <textarea
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50'
            rows={2}
            maxLength={500}
            value={reason}
            disabled={disabled}
            placeholder='Design partner, founder friend, etc.'
            onChange={e => updateReason(e.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}
