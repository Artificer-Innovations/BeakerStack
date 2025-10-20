// Shared string constants for consistent messaging across platforms

export const HOME_STRINGS = {
  title: 'Welcome to Demo App',
  subtitle: 'A modern full-stack application with React, React Native, and Supabase',
} as const;

// Export individual strings for convenience
export const HOME_TITLE = HOME_STRINGS.title;
export const HOME_SUBTITLE = HOME_STRINGS.subtitle;
