export type ThemeColors = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  accent: '#4f46e5',
  tabBarActiveTint: '#4f46e5',
  tabBarInactiveTint: '#9ca3af',
};

export const DARK_COLORS: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  accent: '#818cf8',
  tabBarActiveTint: '#818cf8',
  tabBarInactiveTint: '#6b7280',
};
