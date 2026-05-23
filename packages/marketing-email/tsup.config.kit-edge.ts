import { defineConfig } from 'tsup';

// No `external` — kit port is self-contained (kitClient/kitConfig/kitTagScheme
// have no @beakerstack/* runtime deps). Add external entries if that changes.
export default defineConfig({
  entry: ['src/adapters/kit/edge.ts'],
  format: ['esm'],
  dts: true,
  bundle: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
});
