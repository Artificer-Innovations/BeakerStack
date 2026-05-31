---
title: Getting Started with Beaker Stack
description: A practical walkthrough of the Beaker Stack template — auth, billing, web and mobile apps, and where to customize first.
date: 2026-05-15
tags:
  - guide
  - getting-started
keywords:
  - beaker stack tutorial
  - saas template
---

Beaker Stack is an open-source SaaS template: auth, billing, admin, email, and cross-platform React apps wired together so you can focus on product code instead of boilerplate.

This guide covers the first steps after cloning the repo.

## Clone and install

1. Fork or clone [BeakerStack](https://github.com/Artificer-Innovations/BeakerStack).
2. Run `npm install` at the repo root.
3. Copy `.env.example` files and run the setup wizard (`npm run setup`) for Supabase, Stripe, and deploy secrets.

## Run locally

```bash
npm run dev:start
```

This starts Supabase, the Vite web app, and Expo mobile (optional). Sign up at `/signup` to exercise the full auth flow.

## Customize your product

| Layer      | Path                         | What to change                |
| ---------- | ---------------------------- | ----------------------------- |
| Branding   | `adopter/config/branding.ts` | Display name, slug variants   |
| Legal      | `adopter/config/legal.ts`    | URLs, contact email           |
| Landing    | `adopter/config/landing.ts`  | Marketing copy and nav        |
| Product UI | `adopter/web/`               | Dashboard, routes, components |
| Content    | `adopter/content/`           | Help, articles, policies      |

## Next steps

Read [Why Beaker Stack?](/articles/why-beaker-stack) for the architecture overview and when this template fits your project.
