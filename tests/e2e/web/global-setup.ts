import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import { grantTestAdmin } from '../../utils/integration-fixtures';
import { generateE2ETestEmail } from '../../utils/test-emails';
import { createTestUser, waitForUserProfile } from '../../utils/test-helpers';
import { createWebTestClient } from '../../utils/test-clients';
import {
  applyE2eSupabaseEnv,
  e2eAdminStatePath,
  e2eAdminStorageStatePath,
  e2eAuthDir,
  e2eStatePath,
  e2eStorageStatePath,
  getWebBaseUrl,
  webPath,
  type E2eSeedState,
} from './env';
import { preparePreviewAuthForE2e } from './preview-auth-config';
import { prepareWaitlistModeForE2e } from './waitlist-mode-snapshot';

async function loginAndSaveStorageState(
  storagePath: string,
  email: string,
  password: string,
  bootstrapUrl?: string
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  if (bootstrapUrl) {
    await page.goto(bootstrapUrl, { waitUntil: 'domcontentloaded' });
  }

  await page.goto(webPath('/login'), { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => url.pathname.includes('/dashboard'), {
    timeout: 30_000,
  });

  await context.storageState({ path: storagePath });
  await browser.close();
}

async function globalSetup(_config: FullConfig): Promise<void> {
  applyE2eSupabaseEnv();

  mkdirSync(e2eAuthDir, { recursive: true });

  await preparePreviewAuthForE2e();
  await prepareWaitlistModeForE2e();

  const supabase = createWebTestClient();
  const password =
    process.env.TEST_PASSWORD ||
    process.env.E2E_SEED_PASSWORD ||
    `E2e_${Date.now()}_seed_Aa1`;

  const email = process.env.E2E_SEED_EMAIL || generateE2ETestEmail();
  const { userId } = await createTestUser(supabase, email, password);
  await waitForUserProfile(supabase, userId);

  const adminEmail = generateE2ETestEmail();
  const { userId: adminUserId } = await createTestUser(
    supabase,
    adminEmail,
    password
  );
  await waitForUserProfile(supabase, adminUserId);
  await grantTestAdmin(adminUserId);

  const seed: E2eSeedState = { email, password, userId };
  const adminSeed: E2eSeedState = {
    email: adminEmail,
    password,
    userId: adminUserId,
  };
  writeFileSync(e2eStatePath, JSON.stringify(seed, null, 2));
  writeFileSync(e2eAdminStatePath, JSON.stringify(adminSeed, null, 2));

  const bootstrapUrl = process.env.E2E_BOOTSTRAP_URL?.trim();
  await loginAndSaveStorageState(
    e2eStorageStatePath,
    email,
    password,
    bootstrapUrl
  );
  await loginAndSaveStorageState(
    e2eAdminStorageStatePath,
    adminEmail,
    password,
    bootstrapUrl
  );

  process.env.E2E_SEED_EMAIL = email;
  process.env.E2E_SEED_PASSWORD = password;
  process.env.E2E_BASE_URL = getWebBaseUrl();
}

export default globalSetup;
