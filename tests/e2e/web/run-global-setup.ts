import type { FullConfig } from '@playwright/test';
import globalSetup from './global-setup';

async function main(): Promise<void> {
  await globalSetup({} as FullConfig);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
