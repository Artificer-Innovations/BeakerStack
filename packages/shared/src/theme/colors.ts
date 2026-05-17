const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

const indigo = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
} as const;

export const colors = {
  gray,
  indigo,

  // Surfaces
  pageBg: gray[50],
  cardBg: '#ffffff',
  border: gray[200],
  rowDivider: gray[100],

  // Text
  textPrimary: gray[900],
  textSecondary: gray[800],
  textBody: gray[700],
  textSubtle: gray[600],
  textMuted: gray[500],
  textFaint: gray[400],

  // Brand
  brand: indigo[600],
  brandDark: indigo[700],
  brandLight: indigo[100],

  // Status: error
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
  errorTextAlt: '#b91c1c',
  errorIcon: '#dc2626',
  errorBorderBright: '#ef4444',

  // Status: success
  successBg: '#d1fae5',
  successBorder: '#6ee7b7',
  successText: '#065f46',
  successTextAlt: '#15803d',

  // Status: warn
  warnBg: '#fffbeb',
  warnBorder: '#fde68a',
  warnText: '#92400e',

  // Status: info
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1e3a8a',

  // Feature gate UI
  featureOnBg: '#f0fdf4',
  featureOnBorder: '#86efac',
  featureOnIconBg: '#dcfce7',
  featureOnIcon: '#16a34a',
  featureBOnBg: '#f3e8ff',

  // Flask illustration tokens
  iconBg: indigo[600],
  iconFill: indigo[100],
  iconStroke: '#8b5cf6',
  iconNeck: indigo[200],
  iconLiquid: indigo[400],
} as const;

export type Colors = typeof colors;
