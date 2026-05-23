import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { getWebBaseUrl, isPreviewTarget } from './env';

const configDir = path.dirname(__filename);
const isCi = Boolean(process.env.CI);
const resultsDir = path.join(configDir, 'results');
const reportDir = path.join(configDir, 'report');

export default defineConfig({
  testDir: path.join(configDir, 'specs'),
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: reportDir, open: 'never' }],
    ['junit', { outputFile: path.join(resultsDir, 'web-results.xml') }],
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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer:
    isCi && isPreviewTarget()
      ? undefined
      : {
          command: 'npm run web',
          url: `${(process.env.WEB_URL || 'http://localhost:5173').replace(/\/$/, '')}/`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
