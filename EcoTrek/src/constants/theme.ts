/**
 * EcoTrek design system.
 *
 * Design intent: this should read like a serious outdoor/fitness product, not a
 * kids' app. That means a restrained palette, one accent colour, tight type,
 * soft shadows, and NO emoji anywhere in the UI (use <Icon /> instead).
 */

export const COLORS = {
  // ── Brand ────────────────────────────────────────────────────────────────
  primary: '#16624A',
  primaryDark: '#0C2E24',
  primaryMid: '#124F3C',
  primaryLight: '#2E8B69',
  primaryGlow: '#8FCFB6',
  primarySurface: '#EDF5F1',

  accent: '#C8842A',
  accentLight: '#F7EBD8',
  accentDark: '#9C6620',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  background: '#F7F8F7',
  backgroundDark: '#EFF2F0',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F2F4F3',
  surfaceOverlay: 'rgba(255,255,255,0.96)',

  text: '#14201B',
  textSecondary: '#4A574F',
  textMuted: '#7C8A82',
  textLight: '#A4AEA8',
  textInverse: '#FFFFFF',

  border: '#E2E7E4',
  borderLight: '#EDF0EE',
  borderStrong: '#D2D9D5',

  // ── Status ───────────────────────────────────────────────────────────────
  danger: '#C0392B',
  dangerLight: '#FBEAE8',
  warning: '#B4761A',
  warningLight: '#FBF1E1',
  success: '#16624A',
  successLight: '#EDF5F1',
  info: '#1F5F8B',
  infoLight: '#E8F0F6',

  shadow: '#0C2E24',
  overlay: 'rgba(12,46,36,0.45)',

  // legacy aliases kept so older screens keep compiling
  bark: '#5B4636',
  barkLight: '#8A7561',
  sand: '#F1EADC',
  sky: '#1F5F8B',
  skyLight: '#D6E6F2',

  gradientPrimary: ['#16624A', '#0C2E24'] as [string, string],
  gradientAccent: ['#C8842A', '#9C6620'] as [string, string],
  gradientSky: ['#1F5F8B', '#123D5A'] as [string, string],
};

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const TYPOGRAPHY = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.3 },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.15 },
  h3: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  h4: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMed: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  smallMed: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0 },
  // Uppercase eyebrow label
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  micro: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.6 },
  // Tabular-ish numeral style for stats
  metric: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  metricLg: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -0.5 },
};

export const SHADOWS = {
  none: {},
  sm: {
    shadowColor: '#0C2E24',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0C2E24',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0C2E24',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  xl: {
    shadowColor: '#0C2E24',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

export const TREE_RULES = {
  bikeMilesPerTree: 3,
  hikeMilesPerTree: 1,
};

/** Levels — no emoji, ranked titles only. */
export const LEVELS = [
  { name: 'New Trekker', min: 0 },
  { name: 'Seedling', min: 100 },
  { name: 'Trail Walker', min: 300 },
  { name: 'Forest Friend', min: 700 },
  { name: 'Trail Steward', min: 1500 },
  { name: 'Forest Guardian', min: 3000 },
  { name: 'Peak Explorer', min: 6000 },
  { name: 'EcoChampion', min: 12000 },
  { name: 'Earth Defender', min: 25000 },
  { name: 'Trail Legend', min: 50000 },
];
