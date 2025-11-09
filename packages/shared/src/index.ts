// Shared package exports
// This file will be populated as we add shared components, hooks, and utilities

// Types
export type {};

// Hooks
export {};

// Components
export {};

// Validation
export {};

// Utils
export * from './utils/strings';

// Database types
export * from './types/database';

// Auth types and hooks
export * from './types/auth';
export * from './hooks/useAuth';
export * from './contexts/AuthContext';

// Profile types and hooks
export * from './types/profile';
export * from './hooks/useProfile';
export * from './contexts/ProfileContext';

// Validation schemas
export * from './validation/profileSchema';

// Form components - platform-specific files
// Metro (mobile) and Vite (web) will automatically resolve to .native.tsx or .web.tsx
// Do not export here - apps should import directly from './components/forms/FormInput' etc.
// Exporting both would cause conflicts, so let the bundlers handle platform resolution

// Profile components - platform-specific files
// Metro (mobile) and Vite (web) will automatically resolve to .native.tsx or .web.tsx
// Apps should import directly from './components/profile/ProfileAvatar' etc.
// Exporting both would cause conflicts, so let the bundlers handle platform resolution

export * from './utils/logger';
