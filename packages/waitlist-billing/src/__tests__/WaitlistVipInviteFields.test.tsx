import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistVipInviteFields } from '../WaitlistVipInviteFields.web.js';

describe('WaitlistVipInviteFields', () => {
  it('emits null when VIP is unchecked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WaitlistVipInviteFields
        defaultCompPlanId='beakerstack_vip'
        onChange={onChange}
      />
    );

    await user.click(
      screen.getByRole('checkbox', { name: /grant complimentary vip/i })
    );
    await user.click(
      screen.getByRole('checkbox', { name: /grant complimentary vip/i })
    );

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('emits comp intent when reason is provided', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WaitlistVipInviteFields
        defaultCompPlanId='beakerstack_vip'
        onChange={onChange}
      />
    );

    await user.click(
      screen.getByRole('checkbox', { name: /grant complimentary vip/i })
    );
    await user.type(screen.getByLabelText(/reason/i), 'Design partner');

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'billing_comp',
      planId: 'beakerstack_vip',
      reason: 'Design partner',
    });
  });

  it('hydrates from stored metadata', () => {
    render(
      <WaitlistVipInviteFields
        defaultCompPlanId='beakerstack_vip'
        initialMetadata={{
          provisioning_intent: {
            kind: 'billing_comp',
            planId: 'beakerstack_vip',
            reason: 'Existing',
            grantedBy: 'admin',
          },
        }}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: /grant complimentary vip/i })
    ).toBeChecked();
    expect(screen.getByLabelText(/reason/i)).toHaveValue('Existing');
  });
});
