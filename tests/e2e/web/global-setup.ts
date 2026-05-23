import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import { generateE2ETestEmail } from '../../utils/test-emails';
import { createTestUser, waitForUserProfile } from '../../utils/test-helpers';
import { createWebTestClient } from '../../utils/test-clients';
import {
  applyE2eSupabaseEnv,
  e2eAuthDir,
  e2eStatePath,
  e2eStorageStatePath,
  getWebBaseUrl,
  webPath,
  type E2eSeedState,
} from './env';

async function globalSetup(_config: FullConfig): Promise<void> {
  applyE2eSupabaseEnv();

  mkdirSync(e2eAuthDir, { recursive: true });

  const supabase = createWebTestClient();
  const email = process.env.E2E_SEED_EMAIL || generateE2ETestEmail();
  const password =
    process.env.TEST_PASSWORD ||
    process.env.E2E_SEED_PASSWORD ||
    `E2e_${Date.now()}_seed_Aa1`;

  const { userId } = await createTestUser(supabase, email, password);
  await waitForUserProfile(supabase, userId);

  const seed: E2eSeedState = { email, password, userId };
  writeFileSync(e2eStatePath, JSON.stringify(seed, null, 2));

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const bootstrapUrl = process.env.E2E_BOOTSTRAP_URL?.trim();
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

  await context.storageState({ path: e2eStorageStatePath });
  await browser.close();

  // Avoid leaking seed password into later test processes unless explicitly set.
  process.env.E2E_SEED_EMAIL = email;
  process.env.E2E_SEED_PASSWORD = password;
  process.env.E2E_BASE_URL = getWebBaseUrl();
}

export default globalSetup;
