import { Rocket, Globe, Users, Lock, Layers, TrendingUp } from 'lucide-react';
import type { LandingConfig } from './landing';

export const altLandingConfig: LandingConfig = {
  brand: {
    name: 'LaunchPad',
    tagline: 'From idea to SaaS in a weekend.',
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
    headline: 'Build your SaaS without the boilerplate.',
    subhead: 'LaunchPad is the fastest way to go from idea to paying customers — auth, billing, and mobile included.',
    primaryCta: { label: 'Start building', href: '/signup' },
    secondaryCta: { label: 'See how it works', href: '#features' },
    mediaSrc: '/landing/placeholder-hero.png',
    mediaAlt: 'LaunchPad dashboard',
  },
  featureGrid: {
    heading: 'Everything you need. Nothing you do not.',
    subhead: 'Stop wiring libraries together and start building your actual product.',
    items: [
      { icon: Rocket, title: 'Ship in hours', body: 'Clone, configure, and deploy. Your MVP is live the same day.' },
      { icon: Lock, title: 'Auth included', body: 'Email and OAuth logins via Supabase, secured with row-level policies.' },
      { icon: TrendingUp, title: 'Grow with billing', body: 'Stripe subscriptions and usage metering ready on day one.' },
      { icon: Globe, title: 'Web and mobile', body: 'React and React Native sharing the same business logic.' },
      { icon: Layers, title: 'Clean architecture', body: 'Monorepo with clear package boundaries — easy to extend.' },
      { icon: Users, title: 'Multi-tenant ready', body: 'Data isolation built in. Add your users and go.' },
    ],
  },
  featureRows: [
    {
      title: 'Billing on day one.',
      body: 'Stripe plans, checkout, upgrades, downgrades, and a customer portal — all configured and working before you write a line of product code.',
      ctaLabel: 'See pricing',
      ctaHref: '#pricing',
      mediaSrc: '/landing/placeholder-billing.png',
      mediaAlt: 'Billing UI',
      mediaSide: 'right',
    },
  ],
  pricing: {
    heading: 'Straightforward pricing.',
    subhead: 'Free to start. Pay as you grow.',
  },
  faq: {
    heading: 'Questions',
    items: [
      { q: 'What is LaunchPad?', a: 'LaunchPad is a full-stack SaaS starter built on React, Supabase, and Stripe.' },
      { q: 'Can I use it commercially?', a: 'Yes — MIT licensed.' },
      { q: 'How long does setup take?', a: 'Under five minutes to run locally. Under an hour to deploy.' },
    ],
  },
  finalCta: {
    headline: 'Your next SaaS starts here.',
    subhead: 'Get the foundation right the first time.',
    ctaLabel: 'Start building free',
    ctaHref: '/signup',
  },
  footer: {
    columns: [
      { heading: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }] },
      { heading: 'Company', links: [{ label: 'About', href: '#' }, { label: 'GitHub', href: '#' }] },
      { heading: 'Legal', links: [{ label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }] },
    ],
    legalLinks: [{ label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }],
    copyright: `© ${new Date().getFullYear()} LaunchPad Corp. All rights reserved.`,
  },
};
