import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { WebSelectors } from '../../shared/fixtures';
import {
  e2eAdminStatePath,
  e2eAdminStorageStatePath,
  e2eStatePath,
  e2eStorageStatePath,
  webPath,
  type E2eSeedState,
} from '../env';

function readSeedStateFrom(path: string): E2eSeedState {
  return JSON.parse(readFileSync(path, 'utf8')) as E2eSeedState;
}

export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  seedUser: E2eSeedState;
  adminUser: E2eSeedState;
}>({
  // Playwright fixture with no dependencies — empty destructure is intentional.
  // eslint-disable-next-line no-empty-pattern
  seedUser: async ({}, use) => {
    await use(readSeedStateFrom(e2eStatePath));
  },

  // eslint-disable-next-line no-empty-pattern
  adminUser: async ({}, use) => {
    await use(readSeedStateFrom(e2eAdminStatePath));
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: e2eStorageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: e2eAdminStorageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

export async function fillSignupForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.locator(WebSelectors.emailInput).fill(email);
  await page.locator(WebSelectors.passwordInput).fill(password);
  await page.locator(WebSelectors.confirmPasswordInput).fill(password);
}

export async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.locator(WebSelectors.emailInput).fill(email);
  await page.locator(WebSelectors.passwordInput).fill(password);
}

export async function gotoRoute(page: Page, routePath: string): Promise<void> {
  await page.goto(webPath(routePath));
}

export async function openUserMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'User menu' }).click();
}

export async function signOut(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('button', { name: 'Sign Out' }).click();
}

/** Wait for post-signup navigation or email-confirmation screen (preview can be slow). */
export async function expectSignupOutcome(page: Page): Promise<void> {
  await expect(async () => {
    if (page.url().includes('/dashboard')) {
      return;
    }
    if (
      await page.getByRole('heading', { name: 'Check your email' }).isVisible()
    ) {
      return;
    }
    const error = page.locator(
      '.text-red-800, .text-red-300, .dark\\:text-red-300'
    );
    if (await error.first().isVisible()) {
      throw new Error(`Signup failed: ${await error.first().textContent()}`);
    }
    throw new Error('Expected dashboard or email confirmation after signup');
  }).toPass({ timeout: 30_000 });
}

/** Wait for non-enumerating password reset confirmation. */
export async function expectPasswordResetConfirmation(
  page: Page,
  email: string
): Promise<void> {
  await expect(async () => {
    if (await page.getByText(/If an account exists for/i).isVisible()) {
      return;
    }
    if (
      await page
        .getByText('Something went wrong. Please try again.')
        .isVisible()
    ) {
      throw new Error('Password reset request failed in the UI');
    }
    throw new Error('Expected password reset confirmation message');
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText(email)).toBeVisible();
}
