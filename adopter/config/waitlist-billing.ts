import { appIdentity } from './app-identity';
import type { WaitlistBillingConfig } from '@beakerstack/waitlist-billing';

export const waitlistBillingConfig = {
  productId: appIdentity.productId,
  compPlanIds: ['beakerstack_vip'],
  defaultCompPlanId: 'beakerstack_vip',
} satisfies WaitlistBillingConfig;
