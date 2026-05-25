export type AdminListUsersSort = 'signup' | 'last_active';
export type AdminListUsersSortDir = 'asc' | 'desc';

export type AdminUserListRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  signup_at: string | null;
  last_active_at: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  plan_display_name: string | null;
  is_admin: boolean;
  usage_current_period: Record<string, number>;
};

export type AdminListUsersResult = {
  users: AdminUserListRow[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUserDetail = {
  auth: {
    id: string;
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
  };
  profile: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  admin: {
    is_admin: boolean;
    granted_at: string | null;
    granted_by_email: string | null;
  };
  usage_aggregates: Record<string, unknown>[];
  usage_events: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
};

import type { ReactNode } from 'react';

export type AdminNavItem = {
  label: string;
  to: string;
  icon?: ReactNode;
};

export type RecordAuditEventInput = {
  action: string;
  target?: { type?: string; id?: string };
  details?: Record<string, unknown>;
};
