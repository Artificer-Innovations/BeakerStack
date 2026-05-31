# Articles package security model

## Build-time HTML

Article HTML is generated from trusted repo markdown and sanitized at build time (`sanitizeArticleHtml`) and again in the browser via DOMPurify (`ArticleProse`).

## Link validation

The build hard-fails on internal links to unknown `/articles/{slug}` paths to prevent broken SEO pages in production.

## No server surface

This package has no Edge Functions, database tables, or auth endpoints. Articles are static content committed to the repo.

## SEO injection

Prerender and client head helpers escape HTML attribute values. Do not pass untrusted strings into `seoHead` helpers.
