import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  bundle: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
});
