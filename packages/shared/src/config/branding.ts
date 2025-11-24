// Centralized branding definitions for shared usage across platforms and tests.
// All display strings and casing variants should reference these constants
// so that project renames only require updating this module (or running the
// automated rename script).

export const BRANDING = {
  displayName: 'Beaker Stack',
  shortName: 'Beaker Stack',
  slug: 'beaker-stack',
  camelName: 'beakerStack',
  pascalName: 'BeakerStack',
  snakeName: 'beaker_stack',
  upperSnakeName: 'BEAKER_STACK',
  flatName: 'beakerstack',
} as const;

export type Branding = typeof BRANDING;

/**
 * Convenience helper for building case-insensitive regexes that match the
 * current display name. Useful in tests when asserting on rendered copy.
 */
export const brandNameRegex = (flags: string = 'i') =>
  new RegExp(BRANDING.displayName, flags);
