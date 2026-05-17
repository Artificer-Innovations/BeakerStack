/**
 * Shared color tokens for web (Tailwind) and mobile (React Native).
 *
 * Import path:
 *   - Mobile / shared package internals: `@beakerstack/shared/theme/colors`
 *   - Tailwind config: `../../packages/shared/src/theme/colors` (jiti resolves .ts)
 *
 * `colors.indigo` drives the Tailwind `primary` scale (web) and `colors.brand` (mobile).
 *
 * Follow-ups:
 *   - #250: split into palette + semantic layers; add palette.brand alias for fork support
 *   - #251: add sparse red/amber/green/slate sub-scales so status tokens derive from named steps
 */

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

const white = '#ffffff' as const;

// Shared green-50 value — successBg and featureOnBg are intentionally the same
// shade; a single const prevents them silently drifting apart.
const green50 = '#f0fdf4' as const;

export const colors = {
  gray,
  indigo,
  white,

  // Surfaces
  pageBg: gray[50],
  cardBg: white,
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
  errorBg: '#fef2f2',       // red-50 — card/banner background
  errorBadgeBg: '#fee2e2',  // red-100 — badge/pill background (slightly stronger)
  errorBorder: '#fecaca',   // red-200
  errorText: '#991b1b',     // red-800
  errorTextAlt: '#b91c1c',  // red-700 — lighter variant, e.g. inline message body
  errorIcon: '#dc2626',     // red-600 — icon and err text

  // Status: success
  successBg: green50,       // green-50
  successBorder: '#6ee7b7', // green-300
  successText: '#065f46',   // green-900
  successTextAlt: '#15803d', // green-700 — lighter variant

  // Status: warn
  warnBg: '#fffbeb',
  warnBorder: '#fde68a',
  warnText: '#92400e',

  // Status: info
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1e3a8a',

  // Feature gate UI
  featureOnBg: green50,        // green-50 — same as successBg; shared const prevents drift
  featureOnBorder: '#86efac',  // green-300
  featureOnIconBg: '#dcfce7',  // green-100
  featureOnIcon: '#16a34a',    // green-600
  featureBOnBg: '#f3e8ff',     // purple-100 — Feature B "on" state (intentionally distinct hue)
  featureOffBg: gray[100],     // gray-100 — button/tile background when feature disabled

  // Icon off-state
  iconOffBg: gray[200], // gray-200 — background for off-state icon badges

  // Code display (dark block)
  codeBg: '#0f172a',      // slate-950
  codeText: '#cbd5e1',    // slate-300
  codeValTrue: '#4ade80', // green-400 — highlighted "true" value
  codeValFalse: '#64748b', // slate-500 — dimmed "false" value

  // Flask illustration tokens
  iconBg: indigo[600],
  iconFill: indigo[100],
  iconStroke: '#8b5cf6', // violet-500 — warmer stroke against indigo fill
  iconNeck: indigo[200],
  iconLiquid: indigo[400],
} as const;

export type Colors = typeof colors;
