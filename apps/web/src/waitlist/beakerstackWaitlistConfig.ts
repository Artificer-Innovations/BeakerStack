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
      headline: 'Join the waitlist',
      subhead:
        "We're rolling out access in batches. Drop your email and we'll let you know when your spot opens up.",
      submit_button_label: 'Join waitlist',
      footer_note: "No spam. We'll only email you about your spot.",
      success_message:
        "Thanks — you're on the list. We'll email you when your spot opens up.",
      confirmation:
        "Thanks — you're on the list. We'll email you when your spot opens up.",
      pricing_cta_label: 'Join the waitlist for {tier}',
      tier_panel_header: 'JOIN THE WAITLIST FOR',
    },
    invite_only: {
      message:
        'Sign up is invite-only. Use the link from your invitation email to create an account.',
    },
    closed: {
      message: 'Sign ups are closed right now. Please check back later.',
    },
  },
  metadataFields: [
    {
      id: 'use_case',
      label: `What are you hoping to use ${BRANDING.displayName} for? (optional)`,
      type: 'textarea',
      required: false,
    },
  ],
  emailTemplates: {
    inviteSubject: `You're invited to ${BRANDING.displayName}`,
    inviteHtml:
      '<p>You have been approved. <a href="{{inviteUrl}}">Complete your signup</a>.</p>',
    inviteText: 'Complete your signup: {{inviteUrl}}',
  },
  identityMatch: 'lenient',
});
