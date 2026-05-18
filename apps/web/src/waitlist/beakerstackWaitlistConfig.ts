import { defineWaitlistConfig } from '@beakerstack/waitlist';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { appBasePath } from '../lib/appBasePath';

export const beakerstackWaitlistConfig = defineWaitlistConfig({
  productId: 'beakerstack',
  captureFunctionName: 'waitlist-capture',
  opsFunctionName: 'waitlist-ops',
  appOrigin:
    typeof window !== 'undefined' ? appBasePath() : 'http://localhost:5173',
  copy: {
    waitlist: {
      confirmation:
        "Thanks — you're on the list. We'll be in touch when we're ready for you.",
    },
    invite_only: {
      message:
        'Sign up is invite-only. Use the link from your invitation email to create an account.',
    },
    closed: {
      message: 'Sign ups are closed right now. Please check back later.',
    },
  },
  metadataFields: [],
  emailTemplates: {
    inviteSubject: `You're invited to ${BRANDING.displayName}`,
    inviteHtml:
      '<p>You have been approved. <a href="{{inviteUrl}}">Complete your signup</a>.</p>',
    inviteText: 'Complete your signup: {{inviteUrl}}',
  },
  identityMatch: 'lenient',
});
