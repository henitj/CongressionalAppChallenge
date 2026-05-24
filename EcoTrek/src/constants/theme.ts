export const COLORS = {
  primary: '#1F8A4C',        // EcoTrek green
  primaryDark: '#0E3B2E',
  primaryLight: '#A8E4BC',
  accent: '#F4A300',          // Austin sun
  bark: '#5B3A1B',
  background: '#F4F8F3',
  surface: '#FFFFFF',
  text: '#142B22',
  textMuted: '#5C6B66',
  danger: '#C0392B',
  warning: '#E67E22',
  info: '#2980B9',
  border: '#E2E8E0',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '500' as const },
};

// Conversion rule — what powers the gamification
// 1 tree planted per 1 mile biked or 0.5 mile hiked
export const TREE_RULES = {
  bikeMilesPerTree: 1,
  hikeMilesPerTree: 0.5,
};
