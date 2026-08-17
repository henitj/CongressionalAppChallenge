import { useWindowDimensions } from 'react-native';

/**
 * Responsive layout.
 *
 * Phone layouts stretched edge-to-edge on a tablet look broken: 900px-wide
 * rows of text, cards the size of a paperback, and a two-item stat row with a
 * canyon between the numbers. Everything reads from this hook so there is one
 * place that decides what "wide" means.
 *
 * Breakpoints follow the shortest edge, so a phone in landscape stays a phone
 * and only genuinely large screens get the tablet treatment.
 */

export type Responsive = {
  width: number;
  height: number;
  /** Shortest edge — the honest measure of how much room we have. */
  shortest: number;
  isTablet: boolean;
  isLarge: boolean;
  isLandscape: boolean;
  /** Max width for a readable column. Content is centred inside it. */
  contentWidth: number;
  /** Horizontal page padding. */
  gutter: number;
  /** Sensible column count for card grids. */
  columns: number;
  /** Column count for the badge grid, which wants smaller tiles. */
  badgeColumns: number;
};

const PHONE_MAX = 600;

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);

  const isTablet = shortest >= PHONE_MAX;
  const isLarge = shortest >= 840;
  const isLandscape = width > height;

  return {
    width,
    height,
    shortest,
    isTablet,
    isLarge,
    isLandscape,
    // A single column of text wider than ~760px is uncomfortable to read, so
    // we cap it and centre rather than stretching.
    contentWidth: isTablet ? Math.min(width, isLarge ? 860 : 720) : width,
    gutter: isTablet ? 24 : 16,
    columns: isLarge ? 3 : isTablet ? 2 : 1,
    badgeColumns: isLarge ? 6 : isTablet ? 5 : 3,
  };
}

/**
 * Width percentage for one cell in an n-column grid that uses `gap`.
 * Returned as a number of points so it survives nested flex containers,
 * which percentage widths do not always do on Android.
 */
export function gridItemWidth(available: number, columns: number, gap: number): number {
  return (available - gap * (columns - 1)) / columns;
}
