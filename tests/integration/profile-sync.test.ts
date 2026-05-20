/**
 * Cross-client profile sync (web + mobile Supabase clients).
 */

import { createTestClients } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  signOutUser,
  waitForUserProfile,
  cleanupTestData,
  TestData,
  sleep,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';

describe('Profile sync integration', () => {
  const { web, mobile } = createTestClients();
  let userId: string;
  let email: string;
  let password: string;

  beforeAll(async () => {
    email = uniqueTestEmail();
    const created = await createTestUser(web, email);
    userId = created.userId;
    password = created.password;
    await waitForUserProfile(web, userId);
  });

  afterAll(async () => {
    if (userId) {
      await cleanupTestData(web, userId, { email });
    }
  });

  it('signs in on mobile with the same credentials', async () => {
    await signInTestUser(mobile, email, password);
    const { data } = await mobile.auth.getSession();
    expect(data.session?.user.id).toBe(userId);
    expect(data.session?.access_token).toBeDefined();
  });

  it('reflects profile bio updates from web on mobile', async () => {
    await signInTestUser(web, email, password);
    const newBio = TestData.bio();

    const { error: updateError } = await web
      .from('user_profiles')
      .update({ bio: newBio })
      .eq('user_id', userId);
    expect(updateError).toBeNull();

    await signInTestUser(mobile, email, password);

    let mobileBio: string | null | undefined;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const { data: profile } = await mobile
        .from('user_profiles')
        .select('bio')
        .eq('user_id', userId)
        .single();
      mobileBio = profile?.bio;
      if (mobileBio === newBio) break;
      await sleep(200);
    }

    expect(mobileBio).toBe(newBio);
  });

  it('keeps mobile session after web sign-out', async () => {
    await signInTestUser(web, email, password);
    await signInTestUser(mobile, email, password);

    await signOutUser(web);
    const { data: webSession } = await web.auth.getSession();
    expect(webSession.session).toBeNull();

    const { data: mobileSession } = await mobile.auth.getSession();
    expect(mobileSession.session?.user.id).toBe(userId);
  });

  it('clears mobile session after mobile sign-out', async () => {
    await signInTestUser(mobile, email, password);
    await signOutUser(mobile);
    const { data } = await mobile.auth.getSession();
    expect(data.session).toBeNull();
  });
});
