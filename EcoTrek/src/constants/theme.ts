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
  h1: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.15 },
  h3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  h4: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.1 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyMed: { fontSize: 17, fontWeight: '500' as const, lineHeight: 26 },
  small: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  smallMed: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 15, fontWeight: '500' as const, letterSpacing: 0 },
  overline: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  micro: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  metric: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.3 },
  metricLg: { fontSize: 48, fontWeight: '700' as const, letterSpacing: -0.5 },
};

/** Minimum comfortable tap target for older and disabled users. */
export const TOUCH = {
  min: 52,
};

export const SHADOWS = {
  none: {},
  // Lighter shadows, fewer borders. The old design wrapped every section in a
  // outlined card which felt boxy and busy; this leaves a single faint shadow
  // so cards still feel distinct without screaming "container!".
  sm: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  xl: {
    shadowColor: '#0D3D2D',
    shadowOpacity: 0.14,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
};

export const TREE_RULES = {
  bikeMilesPerTree: 3,
  hikeMilesPerTree: 1,
};

export const LEVELS = [
  { name: 'Just starting', min: 0 },
  { name: 'Getting going', min: 100 },
  { name: 'Regular walker', min: 300 },
  { name: 'Weekend regular', min: 700 },
  { name: 'Out often', min: 1500 },
  { name: 'Every week', min: 3000 },
  { name: 'Long walks', min: 6000 },
  { name: 'Top of the trail', min: 12000 },
  { name: 'All season', min: 25000 },
  { name: 'Trail legend', min: 50000 },
];

export type Appearance = 'light' | 'dark';
export type TextSize = 'default' | 'large' | 'xlarge';
export type ColorPalette = typeof COLORS;

export function paletteFor(appearance: Appearance): ColorPalette {
  return appearance === 'dark' ? PALETTES.dark : PALETTES.light;
}

export const PALETTES: Record<'light' | 'dark', ColorPalette> = {
  light: { ...COLORS },
  dark: {
    ...COLORS,
    primary: '#5FCB9A',
    primaryDark: '#07140F',
    primaryMid: '#3FA97A',
    primaryLight: '#7DD4AD',
    primaryGlow: '#A6E6C8',
    primarySurface: '#17332F',
    accent: '#F0B15A',
    accentLight: '#382B1C',
    accentDark: '#F6C474',
    background: '#11151A',
    backgroundDark: '#0B0E12',
    surface: '#1B2128',
    surfaceElevated: '#232A33',
    surfaceSunken: '#151A20',
    surfaceOverlay: 'rgba(17,21,26,0.97)',
    text: '#F4F7FA',
    textSecondary: '#D7DEE6',
    textMuted: '#AAB4C0',
    textLight: '#7E8A98',
    textInverse: '#11151A',
    border: '#343D48',
    borderLight: '#29313A',
    borderStrong: '#4A5664',
    danger: '#FF7A7A',
    dangerLight: '#3A1818',
    warning: '#F0B15A',
    warningLight: '#3A2A14',
    success: '#5FCB9A',
    successLight: '#163528',
    info: '#7EB6F0',
    infoLight: '#152433',
    successBorder: '#2A5A44',
    infoBorder: '#2A4560',
    warningBorder: '#5A4520',
    dangerBorder: '#5A2A2A',
  },
};

export function fontScaleFor(size: TextSize) {
  return size === 'xlarge' ? 1.32 : size === 'large' ? 1.16 : 1;
}
