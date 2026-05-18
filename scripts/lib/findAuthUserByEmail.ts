import type { SupabaseClient, User } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

/**
 * Find an auth user by email, scanning all pages from auth.admin.listUsers.
 */
export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw error;

    const match = data.users.find(
      u => u.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < PAGE_SIZE) break;
  }

  return null;
}
