import { runE2eGlobalSetup } from './global-setup';

async function main(): Promise<void> {
  await runE2eGlobalSetup();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
