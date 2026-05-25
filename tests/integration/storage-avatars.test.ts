/**
 * Avatars storage bucket RLS and cross-client profile sync.
 */

import { createTestClients } from '../utils/test-clients';
import {
  createTestUser,
  signInTestUser,
  cleanupTestData,
  waitForUserProfile,
  sleep,
} from '../utils/test-helpers';
import { uniqueTestEmail } from '../utils/integration-fixtures';

/** Minimal 1x1 PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const BUCKET = 'avatars';

describe('Storage avatars integration', () => {
  const { web, mobile } = createTestClients();
  let userA: { userId: string; email: string; password: string };
  let userB: { userId: string; email: string; password: string };

  beforeAll(async () => {
    const emailA = uniqueTestEmail();
    const emailB = uniqueTestEmail();
    const a = await createTestUser(web, emailA);
    const b = await createTestUser(web, emailB);
    userA = { userId: a.userId, email: a.email, password: a.password };
    userB = { userId: b.userId, email: b.email, password: b.password };
    await waitForUserProfile(web, userA.userId);
    await waitForUserProfile(web, userB.userId);
  });

  afterAll(async () => {
    await cleanupTestData(web, userA.userId, { email: userA.email });
    await cleanupTestData(web, userB.userId, { email: userB.email });
  });

  it('uploads avatar and exposes public URL', async () => {
    await signInTestUser(web, userA.email, userA.password);
    const path = `${userA.userId}/avatar.png`;

    const { error: uploadError } = await web.storage
      .from(BUCKET)
      .upload(path, TINY_PNG, {
        contentType: 'image/png',
        upsert: true,
      });
    expect(uploadError).toBeNull();

    const { data: urlData } = web.storage.from(BUCKET).getPublicUrl(path);
    expect(urlData.publicUrl).toContain('/storage/v1/object/public/avatars/');

    const res = await fetch(urlData.publicUrl);
    expect(res.ok).toBe(true);
  });

  it('blocks another user from overwriting the object', async () => {
    await signInTestUser(web, userB.email, userB.password);
    const path = `${userA.userId}/avatar.png`;

    const { error } = await web.storage.from(BUCKET).upload(path, TINY_PNG, {
      contentType: 'image/png',
      upsert: true,
    });
    expect(error).not.toBeNull();
  });

  it('syncs avatar_url on profile across clients', async () => {
    await signInTestUser(web, userA.email, userA.password);
    const path = `${userA.userId}/avatar.png`;
    const { data: urlData } = web.storage.from(BUCKET).getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;

    const { error: profileErr } = await web
      .from('user_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', userA.userId);
    expect(profileErr).toBeNull();

    await signInTestUser(mobile, userA.email, userA.password);

    let synced: string | null | undefined;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const { data } = await mobile
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', userA.userId)
        .single();
      synced = data?.avatar_url;
      if (synced === avatarUrl) break;
      await sleep(200);
    }
    expect(synced).toBe(avatarUrl);
  });

  it('removes avatar object on delete', async () => {
    await signInTestUser(web, userA.email, userA.password);
    const path = `${userA.userId}/avatar.png`;

    const { error: removeErr } = await web.storage.from(BUCKET).remove([path]);
    expect(removeErr).toBeNull();

    const { data: list } = await web.storage.from(BUCKET).list(userA.userId);
    const names = (list ?? []).map(f => f.name);
    expect(names).not.toContain('avatar.png');
  });
});
