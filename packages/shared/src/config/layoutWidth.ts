/** Canonical max-width + horizontal padding for web page chrome and shells. */
export const LAYOUT_WIDTH = {
  content: 'max-w-content mx-auto px-4 sm:px-6 lg:px-8',
  prose: 'max-w-prose mx-auto px-4 sm:px-6 lg:px-8',
} as const;

export type LayoutWidthVariant = keyof typeof LAYOUT_WIDTH;
