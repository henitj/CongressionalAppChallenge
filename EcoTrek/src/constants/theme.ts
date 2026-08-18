/**
 * EcoTrek design system.
 *
 * Design intent: a warm, inviting outdoor/fitness product that feels premium
 * and accessible to all ages. Larger touch targets, clearer hierarchy,
 * higher contrast, and a nature-inspired palette that avoids feeling childish.
 */

export const COLORS = {
  // ── Brand ────────────────────────────────────────────────────────────────
  primary: '#1A7A5A',
  primaryDark: '#0D3D2D',
  primaryMid: '#156B4E',
  primaryLight: '#34A078',
  primaryGlow: '#7DD4AD',
  primarySurface: '#EBF7F0',

  accent: '#E8943A',
  accentLight: '#FFF3E0',
  accentDark: '#C47A28',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  background: '#F8FAF9',
  backgroundDark: '#EEF3F0',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F0F4F2',
  surfaceOverlay: 'rgba(255,255,255,0.97)',

  text: '#1A2B24',
  textSecondary: '#3D5248',
  textMuted: '#6B7F75',
  textLight: '#99AAA0',
  textInverse: '#FFFFFF',

  border: '#DDE5E1',
  borderLight: '#EBF0ED',
  borderStrong: '#C8D4CE',

  // ── Status ───────────────────────────────────────────────────────────────
  danger: '#D64545',
  dangerLight: '#FDEAEA',
  warning: '#D4882A',
  warningLight: '#FFF3E0',
  success: '#1A7A5A',
  successLight: '#EBF7F0',
  info: '#2B6CB0',
  infoLight: '#EBF2FA',

  // Borders that pair with the *Light status backgrounds above.
  successBorder: '#C3E6D4',
  infoBorder: '#C4D9ED',
  warningBorder: '#F0D8B0',
  dangerBorder: '#F0BFBF',

  // Leaderboard podium.
  medalSilver: '#8E9C96',
  medalBronze: '#B98A5E',

  shadow: '#0D3D2D',
  overlay: 'rgba(13,61,45,0.5)',

  // legacy aliases
  bark: '#5B4636',
  barkLight: '#8A7561',
  sand: '#F1EADC',
  sky: '#2B6CB0',
  skyLight: '#D6E6F2',

  gradientPrimary: ['#1A7A5A', '#0D3D2D'] as [string, string],
  gradientAccent: ['#E8943A', '#C47A28'] as [string, string],
  gradientSky: ['#2B6CB0', '#1A4A7A'] as [string, string],
};

/**
 * Avatar backgrounds.
 */
export const AVATAR_COLORS = [
  '#1A7A5A',
  '#2B6CB0',
  '#8A5A2B',
  '#6B4B8A',
  '#2E7D6B',
  '#8A4B4B',
];

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
  display: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -0.3 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.15 },
  h3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  h4: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMed: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  smallMed: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const, letterSpacing: 0 },
  overline: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
  metric: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  metricLg: { fontSize: 48, fontWeight: '700' as const, letterSpacing: -0.5 },
};

export const SHADOWS = {
  none: {},
  sm: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  xl: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

export const TREE_RULES = {
  bikeMilesPerTree: 3,
  hikeMilesPerTree: 1,
};

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
