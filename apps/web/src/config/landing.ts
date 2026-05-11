import type { LucideIcon } from 'lucide-react';
import {
  Zap,
  BarChart3,
  Code2,
  Smartphone,
  CreditCard,
  Github,
  GitBranch,
  TestTube,
  Database,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
}

export interface Cta {
  label: string;
  href: string;
}

export interface FeatureGridItem {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface FeatureRow {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  mediaSrc: string;
  mediaAlt: string;
  mediaSide: 'left' | 'right';
}

export type SocialProofKind = 'testimonials' | 'metrics' | 'logos';

export interface SocialProofItem {
  quote?: string;
  author?: string;
  role?: string;
  metric?: string;
  label?: string;
  logoSrc?: string;
  logoAlt?: string;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export interface LandingConfig {
  brand: {
    name: string;
    tagline: string;
    logoSrc?: string;
  };
  nav: {
    links: NavLink[];
    signInHref: string;
    signUpHref: string;
  };
  hero: {
    eyebrow?: string;
    headline: string;
    subhead: string;
    primaryCta: Cta;
    secondaryCta?: Cta;
    mediaSrc: string;
    mediaAlt: string;
    trustStrip?: string;
  };
  featureGrid: {
    heading: string;
    subhead: string;
    items: FeatureGridItem[];
  };
  featureRows: FeatureRow[];
  socialProof?: {
    kind: SocialProofKind;
    items: SocialProofItem[];
  };
  pricing: {
    heading: string;
    subhead: string;
    disclaimer?: string;
  };
  faq: {
    heading: string;
    items: Array<{ q: string; a: string }>;
  };
  finalCta: {
    headline: string;
    subhead: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryCta?: Cta;
  };
  footer: {
    columns: FooterColumn[];
    legalLinks: NavLink[];
    copyright: string;
  };
}

// ── Config ────────────────────────────────────────────────────────────────────

export const landingConfig: LandingConfig = {
  brand: {
    name: 'BeakerStack',
    tagline: 'Ship your SaaS faster.',
  },
  nav: {
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
    signInHref: '/login',
    signUpHref: '/signup',
  },
  hero: {
    eyebrow: 'Open source SaaS template',
    headline: 'Everything you need to ship a real product.',
    subhead:
      'BeakerStack gives you auth, billing, and a cross-platform React foundation — with a three-environment CI/CD pipeline, PR previews, and a layered test suite ready for production.',
    primaryCta: { label: 'Get started free', href: '/signup' },
    secondaryCta: { label: 'See features', href: '#features' },
    mediaSrc: 'https://placehold.co/600x338?text=BeakerStack',
    mediaAlt: 'BeakerStack dashboard screenshot',
    trustStrip: 'Built on React, React Native, Supabase, and Stripe.',
  },
  featureGrid: {
    heading: 'Everything wired. Nothing hidden.',
    subhead: 'Stop stitching libraries together. BeakerStack ships the hard parts pre-integrated.',
    items: [
      {
        icon: Zap,
        title: 'Auth out of the box',
        body: 'Email, OAuth, and magic links via Supabase — no custom session handling required.',
      },
      {
        icon: CreditCard,
        title: 'Billing that works',
        body: 'Stripe subscriptions, usage metering, plan gates, and a customer portal — ready to go.',
      },
      {
        icon: Smartphone,
        title: 'Mobile from day one',
        body: 'Shared business logic between your React web app and React Native mobile app.',
      },
      {
        icon: Database,
        title: 'Supabase backend',
        body: 'Postgres, Auth, Storage, and Edge Functions with RLS-first patterns, schema-generated TypeScript types, and local Docker parity for development and testing.',
      },
      {
        icon: Code2,
        title: 'TypeScript everywhere',
        body: 'End-to-end types from the database schema to your UI components.',
      },
      {
        icon: BarChart3,
        title: 'Usage metering',
        body: 'Track feature usage per user, enforce limits, and surface quota data in the UI.',
      },
      {
        icon: GitBranch,
        title: 'CI/CD pipeline',
        body: 'Path-based PR previews on S3/CloudFront, a staging environment on the develop branch, and production on main — with EAS Update channels aligned for mobile.',
      },
      {
        icon: TestTube,
        title: 'Test discipline',
        body: 'Unit, integration, E2E, and database test layers — colocated with the code they test and documented with a clear decision matrix.',
      },
      {
        icon: Github,
        title: 'Free and open source',
        body: 'MIT licensed. Fork it, own the code, and ship your product. No vendor lock-in, no royalties.',
        ctaLabel: 'View on GitHub',
        ctaHref: 'https://github.com/Artificer-Innovations/BeakerStack',
      },
    ],
  },
  featureRows: [
    {
      title: 'Billing that actually ships.',
      body: 'Most templates stop at "add Stripe." BeakerStack includes plan gating, usage metering, upgrade prompts, a billing portal, and downgrade blockers — all wired to real Stripe products and ready for your plans.',
      ctaLabel: 'See billing docs',
      ctaHref: '#pricing',
      mediaSrc: 'https://placehold.co/560x315?text=Billing+UI',
      mediaAlt: 'Billing plans UI screenshot',
      mediaSide: 'right',
    },
    {
      title: 'Web and mobile from a single codebase.',
      body: 'Shared auth logic. Shared billing hooks. Shared business rules. Your React web app and React Native mobile app stay in sync without duplicated work. About 40–60% of the codebase is shared across platforms.',
      ctaLabel: 'Learn about mobile',
      ctaHref: '#features',
      mediaSrc: 'https://placehold.co/560x315?text=Mobile+App',
      mediaAlt: 'Mobile app screenshot',
      mediaSide: 'left',
    },
    {
      title: 'Environments that match your shipping workflow.',
      body: 'Three Supabase databases—local Docker, shared PR testing, and staging—mirror your branching model. Migrations are validated before they touch production. PR previews deploy automatically to path-based S3/CloudFront URLs. EAS Update channels give mobile the same preview → staging → production flow.',
      ctaLabel: 'Read the architecture docs',
      ctaHref: 'https://github.com/Artificer-Innovations/BeakerStack/blob/main/ARCHITECTURE.md',
      mediaSrc: 'https://placehold.co/560x315?text=Environments',
      mediaAlt: 'Three-environment pipeline diagram',
      mediaSide: 'right',
    },
    {
      title: 'Set up in minutes. Documented for the long haul.',
      body: 'Run `npm run setup` to provision your local environment in one step. QUICKSTART, ARCHITECTURE, and focused guides (OAuth, Stripe, testing) explain key decisions. Env vars and secrets use a consistent layout that maps directly to GitHub Actions.',
      ctaLabel: 'Read the quickstart',
      ctaHref: 'https://github.com/Artificer-Innovations/BeakerStack/blob/main/QUICKSTART.md',
      mediaSrc: 'https://placehold.co/560x315?text=Setup',
      mediaAlt: 'Setup guide screenshot',
      mediaSide: 'left',
    },
  ],
  socialProof: {
    kind: 'metrics',
    items: [
      { metric: '40–60%', label: 'Code shared between web and mobile' },
      { metric: '3 environments', label: 'PR preview, staging, and production' },
      { metric: 'MIT licensed', label: '100% open source, no vendor lock-in' },
    ],
  },
  pricing: {
    heading: 'Simple, transparent pricing.',
    subhead: 'Start free. Upgrade when you need more.',
    disclaimer:
      'BeakerStack itself is free and open-source (MIT) — clone it and ship your product at no cost. The plans below are a live demo of the billing system built into the template. Stripe is running in test mode for this preview; no real charges are made.',
  },
  faq: {
    heading: 'Frequently asked questions',
    items: [
      {
        q: 'Is BeakerStack free to use?',
        a: 'Yes — BeakerStack is free and open source under the MIT license. You can clone the repository, build your product on top of it, and ship commercially with no fees or attribution requirements. The pricing plans shown in the demo are an example of what you can build with the template; they are not a cost to use BeakerStack itself.',
      },
      {
        q: 'What is BeakerStack?',
        a: 'BeakerStack is an opinionated full-stack template built on React, React Native, Supabase, and Stripe. It gives you auth, billing, and a cross-platform foundation ready to customize for your product.',
      },
      {
        q: 'Is it really open source?',
        a: 'Yes — MIT licensed. Fork it, modify it, ship it. No restrictions on commercial use.',
      },
      {
        q: 'Do I need to know React Native?',
        a: 'Not to get started on web. The mobile app shares business logic with the web app, but you can build out the web side first and add mobile later.',
      },
      {
        q: 'How does billing work?',
        a: 'BeakerStack uses Stripe for payments and Supabase for subscription state. You define your plans in a config file, run a sync script to create them in Stripe, and the billing UI is ready.',
      },
      {
        q: 'Can I use this for a commercial product?',
        a: 'Yes. The MIT license allows commercial use without any royalties or attribution requirements.',
      },
      {
        q: 'What do I need to run it locally?',
        a: 'Node.js, a Supabase project (free tier works), and optionally a Stripe test account for billing features. The quickstart guide walks through setup in under five minutes.',
      },
    ],
  },
  finalCta: {
    headline: 'Ready to stop rebuilding the same foundation?',
    subhead: 'Clone BeakerStack, swap the config, and ship your product.',
    ctaLabel: 'Get started free',
    ctaHref: '/signup',
    secondaryCta: {
      label: 'View on GitHub',
      href: 'https://github.com/Artificer-Innovations/BeakerStack',
    },
  },
  footer: {
    columns: [
      {
        heading: 'Product',
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'FAQ', href: '#faq' },
          { label: 'Changelog', href: '#' },
        ],
      },
      {
        heading: 'Company',
        links: [
          { label: 'About', href: '#' },
          { label: 'Blog', href: '#' },
          { label: 'GitHub', href: 'https://github.com/Artificer-Innovations/BeakerStack' },
        ],
      },
      {
        heading: 'Legal',
        links: [
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Refund Policy', href: '/refunds' },
        ],
      },
    ],
    legalLinks: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
    copyright: `© ${new Date().getFullYear()} Artificer Innovations, LLC. All rights reserved.`,
  },
};
