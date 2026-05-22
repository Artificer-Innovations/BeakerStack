import { defineWaitlistConfig } from '@beakerstack/waitlist';
import { BRANDING } from '@beakerstack/shared/config/branding';
import { LEGAL_CONFIG } from '@beakerstack/shared/config/legal';
import { appBasePath } from '../lib/appBasePath';

const appOrigin =
  typeof window !== 'undefined' ? appBasePath() : 'http://localhost:5173';

export const beakerstackWaitlistConfig = defineWaitlistConfig({
  productId: 'beakerstack',
  captureFunctionName: 'waitlist-capture',
  opsFunctionName: 'waitlist-ops',
  appOrigin,
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
    inviteHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>You're invited to ${BRANDING.displayName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:20px 40px;border-bottom:1px solid #e4e4e7;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="{{logoUrl}}" width="36" height="36" alt="" style="display:block;">
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:18px;font-weight:600;color:#18181b;letter-spacing:-0.01em;">${BRANDING.displayName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b;letter-spacing:-0.02em;">You're in — complete your signup</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">Your spot on the ${BRANDING.displayName} waitlist has been approved. Click the button below to create your account.</p>
            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="border-radius:6px;background:#4f46e5;">
                  <a href="{{inviteUrl}}"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:6px;">Complete signup</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;">
              Or copy this link into your browser:<br>
              <span style="word-break:break-all;color:#71717a;">{{inviteUrl}}</span>
            </p>
          </td>
        </tr>
        <!-- Footer (CAN-SPAM) -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f4f4f5;">
            <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;line-height:1.5;">
              Sent by ${BRANDING.displayName}.<br>
              ${LEGAL_CONFIG.mailingAddress}
            </p>
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              Questions? Email <a href="mailto:${LEGAL_CONFIG.contactEmail}" style="color:#a1a1aa;text-decoration:underline;">${LEGAL_CONFIG.contactEmail}</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    inviteText: 'Complete your signup: {{inviteUrl}}',
  },
  identityMatch: 'lenient',
});
