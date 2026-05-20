/**
 * user_profiles RLS and cross-user access (authenticated Supabase client).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createWebTestClient } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  waitForUserProfile,
} from '../utils/test-helpers';
import {
  uniqueTestEmail,
  cleanupIntegrationTestUser,
} from '../utils/integration-fixtures';

describe('Auth RLS integration', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let anon: SupabaseClient;
  let userA: { userId: string; email: string; password: string };
  let userB: { userId: string; email: string; password: string };

  beforeAll(async () => {
    clientA = createWebTestClient();
    clientB = createWebTestClient();
    anon = createWebTestClient();

    const emailA = uniqueTestEmail();
    const emailB = uniqueTestEmail();
    const a = await createTestUser(clientA, emailA);
    const b = await createTestUser(clientB, emailB);
    userA = { userId: a.userId, email: a.email, password: a.password };
    userB = { userId: b.userId, email: b.email, password: b.password };

    await waitForUserProfile(clientA, userA.userId);
    await waitForUserProfile(clientB, userB.userId);
  });

  afterAll(async () => {
    await cleanupIntegrationTestUser(userA.userId, { email: userA.email });
    await cleanupIntegrationTestUser(userB.userId, { email: userB.email });
  });

  it('allows authenticated user to read another user profile', async () => {
    await signInTestUser(clientA, userA.email, userA.password);

    const { data, error } = await clientA
      .from('user_profiles')
      .select('user_id, username')
      .eq('user_id', userB.userId)
      .single();

    expect(error).toBeNull();
    expect(data?.user_id).toBe(userB.userId);
  });

  it('allows unauthenticated read of profiles (public SELECT policy)', async () => {
    await anon.auth.signOut();

    const { data, error } = await anon
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userA.userId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.user_id).toBe(userA.userId);
  });

  it('blocks updating another user profile', async () => {
    await signInTestUser(clientA, userA.email, userA.password);

    const { data, error } = await clientA
      .from('user_profiles')
      .update({ bio: 'Hacked!' })
      .eq('user_id', userB.userId)
      .select();

    if (error) {
      expect(error).toBeDefined();
    } else {
      expect(data ?? []).toHaveLength(0);
    }
  });

  it('allows user to delete their own profile row', async () => {
    const email = uniqueTestEmail();
    const tempClient = createWebTestClient();
    const { userId, password } = await createTestUser(tempClient, email);
    await waitForUserProfile(tempClient, userId);
    await signInTestUser(tempClient, email, password);

    const { error: deleteError } = await tempClient
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    expect(deleteError).toBeNull();

    const { data: after } = await tempClient
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    expect(after).toBeNull();

    await cleanupIntegrationTestUser(userId, { email });
  });

  it('service role can remove test user artifacts', async () => {
    const email = uniqueTestEmail();
    const temp = createWebTestClient();
    const { userId } = await createTestUser(temp, email);
    await waitForUserProfile(temp, userId);

    await expect(
      cleanupIntegrationTestUser(userId, { email })
    ).resolves.toBeUndefined();

    const { data } = await temp
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
