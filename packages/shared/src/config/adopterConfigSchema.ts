import { z } from 'zod';

export const brandingSchema = z.object({
  displayName: z.string(),
  shortName: z.string(),
  slug: z.string(),
  camelName: z.string(),
  pascalName: z.string(),
  snakeName: z.string(),
  upperSnakeName: z.string(),
  flatName: z.string(),
});

export const legalSchema = z.object({
  brandName: z.string(),
  brandUrl: z.string(),
  legalEntityName: z.string(),
  contactEmail: z.string(),
  mailingAddress: z.string(),
});

export const adopterConfigSchema = z
  .object({
    branding: brandingSchema,
    legal: legalSchema,
    postLoginPath: z.string(),
    postLoginPathMobile: z.string(),
  })
  .strip();

export type BrandingConfig = z.infer<typeof brandingSchema>;
export type LegalConfig = z.infer<typeof legalSchema>;
export type AdopterConfig = z.infer<typeof adopterConfigSchema>;
