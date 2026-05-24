import globalTeardown from './global-teardown';

async function main(): Promise<void> {
  await globalTeardown();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
