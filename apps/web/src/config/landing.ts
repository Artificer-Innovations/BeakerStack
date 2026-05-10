import type { LucideIcon } from 'lucide-react';
import {
  Zap,
  Shield,
  BarChart3,
  Code2,
  Smartphone,
  CreditCard,
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
      'BeakerStack gives you auth, billing, and a cross-platform React foundation — wired together and ready to customize.',
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
        icon: Shield,
        title: 'Row-level security',
        body: 'Supabase RLS policies pre-configured for multi-tenant data isolation.',
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
      body: 'Shared auth logic, shared billing hooks, shared business rules — your React web app and React Native mobile app stay in sync without duplicating code.',
      ctaLabel: 'Learn about mobile',
      ctaHref: '#features',
      mediaSrc: 'https://placehold.co/560x315?text=Mobile+App',
      mediaAlt: 'Mobile app screenshot',
      mediaSide: 'left',
    },
  ],
  socialProof: {
    kind: 'metrics',
    items: [
      { metric: '3 platforms', label: 'Web, iOS, and Android from one repo' },
      { metric: '< 5 minutes', label: 'From clone to running locally' },
      { metric: '100% open source', label: 'MIT licensed, no vendor lock-in' },
    ],
  },
  pricing: {
    heading: 'Simple, transparent pricing.',
    subhead: 'Start free. Upgrade when you need more.',
  },
  faq: {
    heading: 'Frequently asked questions',
    items: [
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
