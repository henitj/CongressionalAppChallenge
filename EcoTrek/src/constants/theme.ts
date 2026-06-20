export const COLORS = {
  primaryMid: '#145C33',

  // Primary greens
  primary: '#1A7A43',
  primaryDark: '#0A2E1A',
  primaryLight: '#4CAF77',
  primaryGlow: '#A8E6C0',
  primarySurface: '#EAF7EF',

  // Accents
  accent: '#F4A300',
  accentLight: '#FFE0A0',
  accentDark: '#C47F00',

  // Earth tones
  bark: '#5B3A1B',
  barkLight: '#8B6040',
  sand: '#F5ECD7',

  // Sky / water
  sky: '#1A91D1',
  skyLight: '#BDE8FF',

  // Neutrals
  background: '#F2F7F4',
  backgroundDark: '#E5EFE9',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFCFB',
  surfaceOverlay: 'rgba(255,255,255,0.95)',

  // Text
  text: '#0F2318',
  textSecondary: '#2D4A38',
  textMuted: '#6B7F74',
  textLight: '#9EAFA7',
  textInverse: '#FFFFFF',

  // Status
  danger: '#D32F2F',
  dangerLight: '#FFEBEE',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  success: '#1A7A43',
  successLight: '#EAF7EF',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // UI
  border: '#D8E5DC',
  borderLight: '#ECF3EE',
  shadow: '#0A2E1A',
  overlay: 'rgba(10,46,26,0.6)',

  // Gradients (used as array pairs)
  gradientPrimary: ['#1A7A43', '#0A2E1A'] as [string, string],
  gradientAccent: ['#F4A300', '#C47F00'] as [string, string],
  gradientSky: ['#1A91D1', '#0D5F8A'] as [string, string],
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
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  pill: 999,
};

export const TYPOGRAPHY = {
  display: { fontSize: 36, fontWeight: '900' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  h4: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 23 },
  bodyMed: { fontSize: 15, fontWeight: '500' as const, lineHeight: 23 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  smallMed: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  micro: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0A2E1A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0A2E1A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A2E1A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  xl: {
    shadowColor: '#0A2E1A',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

export const TREE_RULES = {
  bikeMilesPerTree: 1,
  hikeMilesPerTree: 0.5,
};