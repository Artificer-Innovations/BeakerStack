import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { getWebBaseUrl, isPreviewTarget } from './env';

const configDir = path.dirname(__filename);
const isCi = Boolean(process.env.CI);
const resultsDir = path.join(configDir, 'results');
const reportDir = path.join(configDir, 'report');

function resolveJsonReportPath(): string {
  const configured = process.env.PLAYWRIGHT_JSON_REPORT?.trim();
  if (!configured) {
    return path.join(resultsDir, 'web-results.json');
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }
  const normalized = configured.replace(/\\/g, '/');
  // CI/npm often pass repo-root paths (tests/e2e/web/results/...).
  if (normalized.startsWith('tests/')) {
    return path.resolve(process.cwd(), normalized);
  }
  // Paths relative to this config file (e.g. results/chromium-results.json).
  return path.join(configDir, normalized);
}

const jsonReportPath = resolveJsonReportPath();
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS);
const ciWorkers =
  Number.isFinite(configuredWorkers) && configuredWorkers > 0
    ? configuredWorkers
    : 4;

export default defineConfig({
  testDir: path.join(configDir, 'specs'),
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? ciWorkers : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: reportDir, open: 'never' }],
    ['junit', { outputFile: path.join(resultsDir, 'web-results.xml') }],
    ['json', { outputFile: jsonReportPath }],
  ],
  globalSetup: path.join(configDir, 'global-setup.ts'),
  globalTeardown: path.join(configDir, 'global-teardown.ts'),
  outputDir: path.join(configDir, 'test-results'),
  use: {
    baseURL: getWebBaseUrl(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [
        /specs\/waitlist\//,
        /admin\/waitlist-settings\.spec\.ts/,
        /specs\/profile\//,
        /specs\/billing\/metered-usage\.spec\.ts/,
        /specs\/billing\/billing-stripe\.spec\.ts/,
        /admin\/users\.spec\.ts/,
        /admin\/waitlist\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'shared-state',
      testMatch: [
        /specs\/profile\//,
        /specs\/billing\/metered-usage\.spec\.ts/,
        /specs\/billing\/billing-stripe\.spec\.ts/,
        /admin\/users\.spec\.ts/,
        /admin\/waitlist\.spec\.ts/,
      ],
      fullyParallel: false,
      workers: 1,
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'signup-mode',
      testMatch: [/specs\/waitlist\//, /admin\/waitlist-settings\.spec\.ts/],
      fullyParallel: false,
      workers: 1,
      dependencies: ['shared-state'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isPreviewTarget()
    ? undefined
    : {
        command: 'npm run web',
        url: `${(process.env.WEB_URL || 'http://localhost:5173').replace(/\/$/, '')}/`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
