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

export type Appearance = 'light' | 'dark' | 'sky';
export type TextSize = 'default' | 'large' | 'xlarge';
export type SkyPhase = 'sunrise' | 'afternoon' | 'sunset' | 'night';

export type ColorPalette = typeof COLORS;

export function skyPhaseForHour(hour: number): SkyPhase {
  if (hour < 5 || hour >= 20) return 'night';
  if (hour < 9) return 'sunrise';
  if (hour < 16) return 'afternoon';
  return 'sunset';
}

/** Sky look only applies in daytime. At night it falls back to light. */
export function paletteFor(appearance: Appearance, hour = new Date().getHours()): ColorPalette {
  if (appearance === 'dark') return PALETTES.dark;
  if (appearance !== 'sky') return PALETTES.light;
  const phase = skyPhaseForHour(hour);
  if (phase === 'night') return PALETTES.light;
  return SKY_PALETTES[phase];
}

const SKY_PALETTES: Record<Exclude<SkyPhase, 'night'>, ColorPalette> = {
  sunrise: {
    ...COLORS,
    primary: '#C45C2A',
    primaryDark: '#7A3318',
    primaryMid: '#D4683A',
    primaryLight: '#E8943A',
    primaryGlow: '#F3C08A',
    primarySurface: '#FFE8D6',
    accent: '#E07040',
    accentLight: '#FFE4D4',
    accentDark: '#B84A22',
    background: '#FFF4EB',
    backgroundDark: '#F8E6D8',
    surface: '#FFFBF7',
    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#F8EDE4',
    text: '#3A2418',
    textSecondary: '#5C3D2A',
    textMuted: '#8A6754',
    border: '#E8D2C2',
    borderLight: '#F3E6DC',
    borderStrong: '#D4B8A4',
  },
  afternoon: {
    ...COLORS,
    primary: '#1A7A5A',
    primaryDark: '#0D3D2D',
    primaryLight: '#2B9A6E',
    primaryGlow: '#7DD4AD',
    primarySurface: '#E3F4FF',
    accent: '#2B6CB0',
    accentLight: '#D6EAF8',
    accentDark: '#1A4A7A',
    background: '#F3FAFF',
    backgroundDark: '#E4F1F8',
    surface: '#FFFFFF',
    surfaceSunken: '#EAF3F8',
    border: '#D0E0EA',
    borderLight: '#E4EEF4',
    borderStrong: '#B7CCD8',
  },
  sunset: {
    ...COLORS,
    primary: '#B84A2A',
    primaryDark: '#5A2218',
    primaryMid: '#C45C2A',
    primaryLight: '#E07040',
    primaryGlow: '#F0A070',
    primarySurface: '#FFE0D0',
    accent: '#E8943A',
    accentLight: '#FFE8D0',
    accentDark: '#C45C2A',
    background: '#FFF0E8',
    backgroundDark: '#F4DCD0',
    surface: '#FFF8F4',
    surfaceSunken: '#F8E4D8',
    text: '#3A1E18',
    textSecondary: '#5C3228',
    textMuted: '#8A5848',
    border: '#E8C8B8',
    borderLight: '#F4E0D6',
    borderStrong: '#D4A890',
  },
};

export const PALETTES: Record<'light' | 'dark', ColorPalette> = {
  light: { ...COLORS },
  dark: {
    ...COLORS,
    primary: '#5FCB9A',
    primaryDark: '#07140F',
    primaryMid: '#3FA97A',
    primaryLight: '#7DD4AD',
    primaryGlow: '#A6E6C8',
    primarySurface: '#163528',
    accent: '#F0B15A',
    accentLight: '#3A2A14',
    accentDark: '#F0B15A',
    background: '#0E1713',
    backgroundDark: '#0A120E',
    surface: '#18241E',
    surfaceElevated: '#1E2D26',
    surfaceSunken: '#121C17',
    surfaceOverlay: 'rgba(14,23,19,0.97)',
    text: '#F2F7F4',
    textSecondary: '#D5E0DA',
    textMuted: '#B4C4BB',
    textLight: '#8A9C93',
    textInverse: '#0E1713',
    border: '#2C3D34',
    borderLight: '#24332C',
    borderStrong: '#3D5248',
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
