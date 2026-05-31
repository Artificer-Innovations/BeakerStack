import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date YYYY-MM-DD');

export const articleFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z
      .string()
      .min(50, 'description must be at least 50 characters')
      .max(160, 'description must be at most 160 characters'),
    date: isoDate,
    updated: isoDate.optional(),
    tags: z.array(z.string().min(1)).min(1),
    author: z.string().min(1).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case')
      .optional(),
    draft: z.boolean().optional(),
    ogImage: z.string().min(1).optional(),
    canonical: z.string().url().optional(),
    keywords: z.array(z.string().min(1)).optional(),
    snapshotDate: isoDate.optional(),
  })
  .superRefine((value, ctx) => {
    const comparativeTags = ['comparison', 'vs', 'alternatives'];
    const isComparative = value.tags.some(tag => comparativeTags.includes(tag));
    if (isComparative && !value.snapshotDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'snapshotDate is required when tags include comparison, vs, or alternatives',
        path: ['snapshotDate'],
      });
    }
  });

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
