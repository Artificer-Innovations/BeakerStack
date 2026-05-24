import type { FullConfig } from '@playwright/test';
import globalSetup from './global-setup';

await globalSetup({} as FullConfig);
