// Shared string constants for consistent messaging across platforms
import { BRANDING } from '../config/branding';

export const HOME_STRINGS = {
  title: `Welcome to ${BRANDING.displayName}`,
  subtitle:
    'A modern full-stack application with React, React Native, and Supabase',
} as const;

export const DASHBOARD_STRINGS = {
  title: 'Welcome to your dashboard!',
  subtitle: 'This is where your main application content will go',
} as const;

// Export individual strings for convenience
export const HOME_TITLE = HOME_STRINGS.title;
export const HOME_SUBTITLE = HOME_STRINGS.subtitle;
export const DASHBOARD_TITLE = DASHBOARD_STRINGS.title;
export const DASHBOARD_SUBTITLE = DASHBOARD_STRINGS.subtitle;
