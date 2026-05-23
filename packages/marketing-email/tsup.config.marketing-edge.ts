import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/edge.ts'],
  format: ['esm'],
  dts: true,
  bundle: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  external: ['@beakerstack/lifecycle-events', '@supabase/supabase-js'],
});
