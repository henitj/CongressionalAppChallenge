/**
 * Pure geometry helpers.
 *
 * Kept free of any react-native import so it can run in plain Node (tests,
 * scripts, and later your API server if you want the same distance maths on
 * both sides).
 */

export type Coord = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number; // metres
  speed?: number; // m/s
};

/** Great-circle distance in miles. */
export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 3958.8; // Earth radius, miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
