export const branding = {
  displayName: 'Beaker Stack',
  shortName: 'Beaker Stack',
  slug: 'beaker-stack',
  camelName: 'beakerStack',
  pascalName: 'BeakerStack',
  snakeName: 'beaker_stack',
  upperSnakeName: 'BEAKER_STACK',
  flatName: 'beakerstack',
} as const;

export type Branding = typeof branding;

export const brandNameRegex = (flags: string = 'i') =>
  new RegExp(branding.displayName, flags);
