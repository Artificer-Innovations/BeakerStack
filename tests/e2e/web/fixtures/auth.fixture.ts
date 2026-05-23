import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { WebSelectors } from '../../shared/fixtures';
import {
  e2eStatePath,
  e2eStorageStatePath,
  webPath,
  type E2eSeedState,
} from '../env';

function readSeedState(): E2eSeedState {
  return JSON.parse(readFileSync(e2eStatePath, 'utf8')) as E2eSeedState;
}

export const test = base.extend<{
  authenticatedPage: Page;
  seedUser: E2eSeedState;
}>({
  // Playwright fixture with no dependencies — empty destructure is intentional.
  // eslint-disable-next-line no-empty-pattern
  seedUser: async ({}, use) => {
    await use(readSeedState());
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: e2eStorageStatePath,
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
