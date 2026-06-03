import { z } from 'zod';

export const storedConnectionStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'blocked',
  'disconnected',
]);

export const effectiveConnectionStatusSchema = storedConnectionStatusSchema.or(
  z.literal('expired_pending')
);

export type StoredConnectionStatus = z.infer<
  typeof storedConnectionStatusSchema
>;
export type EffectiveConnectionStatus = z.infer<
  typeof effectiveConnectionStatusSchema
>;

export const connectionListRowSchema = z.object({
  id: z.string().uuid(),
  status: storedConnectionStatusSchema,
  effective_status: effectiveConnectionStatusSchema,
  initiator_user_id: z.string().uuid(),
  recipient_user_id: z.string().uuid(),
  is_initiator: z.boolean(),
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  accepted_at: z.string().nullable(),
});

export type ConnectionListRow = z.infer<typeof connectionListRowSchema>;

export const connectionStatusRowSchema = z.object({
  status: storedConnectionStatusSchema.or(z.literal('none')),
  effective_status: effectiveConnectionStatusSchema.or(z.literal('none')),
  is_initiator: z.boolean(),
  connection_id: z.string().uuid().nullable(),
});

export type ConnectionStatusRow = z.infer<typeof connectionStatusRowSchema>;

export const userSearchRowSchema = z.object({
  user_id: z.string().uuid(),
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export type UserSearchRow = z.infer<typeof userSearchRowSchema>;
