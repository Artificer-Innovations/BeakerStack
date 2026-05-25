export type SignupMode = 'open' | 'waitlist' | 'invite_only' | 'closed';

export type WaitlistEntryStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'converted';

export type IdentityMatchMode = 'lenient' | 'strict';

export interface WaitlistPublicSettings {
  signup_mode: SignupMode;
  copy: Record<string, Record<string, string>>;
  metadata_schema: WaitlistMetadataField[];
}

export interface WaitlistMetadataField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'hidden';
  required?: boolean | undefined;
}

export interface WaitlistEntryRow {
  id: string;
  email: string;
  status: WaitlistEntryStatus;
  metadata: Record<string, unknown>;
  submitted_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  converted_at: string | null;
  converted_user_id: string | null;
  has_active_invite: boolean;
}

export interface WaitlistListResult {
  entries: WaitlistEntryRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface WaitlistAdminSettings {
  signup_mode: SignupMode;
  default_plan_id: string;
  invite_ttl_days: number;
  identity_match_mode: IdentityMatchMode;
  copy: Record<string, Record<string, string>>;
  metadata_schema: WaitlistMetadataField[];
  updated_at: string;
}

export interface ValidateInviteResult {
  valid: boolean;
  entry_id?: string;
  email?: string;
  expires_at?: string;
  identity_match_mode?: IdentityMatchMode;
  default_plan_id?: string;
}
