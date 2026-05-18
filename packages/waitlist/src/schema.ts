import { z } from 'zod';

export const signupModeSchema = z.enum([
  'open',
  'waitlist',
  'invite_only',
  'closed',
]);

export const waitlistMetadataFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'hidden']),
  required: z.boolean().optional(),
});

export const waitlistCopySchema = z.record(z.record(z.string()));

export const waitlistConfigSchema = z.object({
  productId: z.string().min(1),
  captureFunctionName: z.string().default('waitlist-capture'),
  opsFunctionName: z.string().default('waitlist-ops'),
  appOrigin: z.string().url(),
  copy: waitlistCopySchema.optional(),
  metadataFields: z.array(waitlistMetadataFieldSchema).default([]),
  emailTemplates: z.object({
    inviteSubject: z.string().min(1),
    inviteHtml: z.string().min(1),
    inviteText: z.string().optional(),
  }),
  identityMatch: z.enum(['lenient', 'strict']).default('lenient'),
});

export type WaitlistConfig = z.infer<typeof waitlistConfigSchema>;

export function defineWaitlistConfig(config: WaitlistConfig): WaitlistConfig {
  return waitlistConfigSchema.parse(config);
}
