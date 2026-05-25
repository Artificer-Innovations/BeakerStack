import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/edge.ts'],
  format: ['esm'],
  dts: true,
  bundle: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  external: ['@beakerstack/logger'],
  noExternal: ['zod'],
});
