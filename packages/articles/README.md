# @beakerstack/articles

Build-time markdown articles, SEO metadata, and React pages for BeakerStack web apps.

## Content source

Authors commit plain markdown under `adopter/content/articles/*.md` with YAML frontmatter. The build:

1. Validates frontmatter (Zod)
2. Renders GFM to HTML and sanitizes at build time
3. Validates internal links (`/articles/{slug}`)
4. Computes reading time, excerpts, related articles, tag index
5. Writes `src/generated/articles.ts` and `apps/web/public/sitemap-articles.xml`

Regenerate:

```bash
npm run build:articles -w @beakerstack/articles
```

Site config comes from `adopter/config/legal.ts` (origin), `branding.ts` (publisher name), and `landing-seo.ts` (default OG image).

## Exports

| Subpath       | Purpose                                    |
| ------------- | ------------------------------------------ |
| `.`           | `ARTICLES` manifest, queries, utils        |
| `./web`       | Index, detail, tag pages, head components  |
| `./generated` | Committed manifest                         |
| `./nav`       | `{ href: '/articles', label: 'Articles' }` |

## Routes

Public routes (typical):

- `/articles` — index
- `/articles/:slug` — article detail
- `/articles/tags/:tag` — tag listing

Production builds should run `apps/web/scripts/prerender-articles.ts` for SEO HTML and JSON-LD.

## Frontmatter

Required: `title`, `description` (50–160 chars), `date` (ISO), `tags[]` (≥1).

Optional: `updated`, `slug`, `draft`, `snapshotDate` (required when tags include `comparison`, `vs`, or `alternatives`), `keywords[]`, `author`, `canonical`, `ogImage`.

Set `draft: true` to exclude from index, sitemap, and routes.
