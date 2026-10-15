import AsyncStorage from '@react-native-async-storage/async-storage';

export type TrailRatings = Record<string, number>;
const LEGACY_KEY = '@ecotrek/trail-ratings';
let pending: Promise<void> = Promise.resolve();
// Undefined supports older callers/tests; app screens always pass a profile.
const ratingKey = (userId?: string | null) => userId === undefined ? LEGACY_KEY : `@ecotrek/${userId ?? 'anon'}/trail-ratings`;
const safeId = (id: string) => !!id && !['__proto__', 'constructor', 'prototype'].includes(id);
function parseRatings(raw: string | null): TrailRatings {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, value]) => safeId(id) && typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5)) as TrailRatings;
  } catch { return {}; }
}
async function readRatings(key: string): Promise<TrailRatings> {
  const saved = parseRatings(await AsyncStorage.getItem(key));
  if (key === LEGACY_KEY) return saved;
  // Claim the old device-wide ratings once for the current profile. Do not
  // copy them into every account on a shared phone. Existing profile edits win.
  const legacy = parseRatings(await AsyncStorage.getItem(LEGACY_KEY));
  if (Object.keys(legacy).length) {
    const migrated = { ...legacy, ...saved };
    await AsyncStorage.setItem(key, JSON.stringify(migrated));
    await AsyncStorage.removeItem(LEGACY_KEY);
    return migrated;
  }
  return saved;
}
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const operation = pending.catch(() => {}).then(task);
  pending = operation.then(() => {}, () => {});
  return operation;
}
export function loadTrailRatings(userId?: string | null): Promise<TrailRatings> {
  return serialize(async () => { try { return await readRatings(ratingKey(userId)); } catch { return {}; } });
}
function update(trailId: string, stars: number | null, userId?: string | null): Promise<void> {
  if (!safeId(trailId) || (stars !== null && !Number.isFinite(stars))) return Promise.reject(new Error('Choose a rating from 1 to 5.'));
  return serialize(async () => {
    const key = ratingKey(userId);
    const ratings = await readRatings(key);
    if (stars === null) delete ratings[trailId];
    else ratings[trailId] = Math.max(1, Math.min(5, Math.round(stars)));
    await AsyncStorage.setItem(key, JSON.stringify(ratings));
  });
}
export function saveTrailRating(trailId: string, stars: number, userId?: string | null): Promise<void> { return update(trailId, stars, userId); }
export function removeTrailRating(trailId: string, userId?: string | null): Promise<void> { return update(trailId, null, userId); }

export function trailPreferenceScore(
  candidate: { id: string; type: string; difficulty: string },
  catalogue: { id: string; type: string; difficulty: string }[],
  ratings: TrailRatings
): number {
  return catalogue.reduce((score, previous) => {
    const rating = ratings[previous.id];
    if (!rating || previous.id === candidate.id) return score;
    const similarity = (previous.type === candidate.type ? 1 : 0) +
      (previous.difficulty === candidate.difficulty ? 0.6 : 0);
    return score + (rating - 3) * similarity;
  }, 0);
}
