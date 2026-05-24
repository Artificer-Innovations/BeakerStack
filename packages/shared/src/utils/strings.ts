import { getAdopterConfig } from '../config/adopterRuntime';

export function getHomeStrings() {
  const { branding } = getAdopterConfig();
  return {
    title: `Welcome to ${branding.displayName}`,
    subtitle:
      'A modern full-stack application with React, React Native, and Supabase. Supporting both web and mobile platforms, social authentication, and more.',
  } as const;
}

export const DASHBOARD_STRINGS = {
  title: 'Welcome to your dashboard!',
  subtitle: 'This is where your main application content will go.',
} as const;

export function getHomeTitle() {
  return getHomeStrings().title;
}

export function getHomeSubtitle() {
  return getHomeStrings().subtitle;
}

export const DASHBOARD_TITLE = DASHBOARD_STRINGS.title;
export const DASHBOARD_SUBTITLE = DASHBOARD_STRINGS.subtitle;
