import typography from '@tailwindcss/typography';
import { colors } from '../../packages/shared/src/theme/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/components/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/config/**/*.{js,ts}',
    '../../packages/articles/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/connections/src/**/*.{js,ts,jsx,tsx}',
    '../../adopter/web/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Emitted from layoutWidth.ts (shared config); ensure JIT includes width tokens
    'max-w-content',
    'max-w-prose',
  ],
  theme: {
    extend: {
      maxWidth: {
        content: '64rem', // 1024px — headers, footers, page shells
        prose: '50rem', // 800px — FAQ, policy body
      },
      colors: {
        // Pin gray and indigo Tailwind scales to shared tokens so future
        // changes to colors.ts propagate to gray-* / indigo-* classes automatically.
        gray: colors.gray,
        indigo: colors.indigo,
        // primary-* → indigo, aligning web with mobile colors.brand (#4f46e5)
        primary: colors.indigo,
      },
    },
  },
  plugins: [typography],
};
