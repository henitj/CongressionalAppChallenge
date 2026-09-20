import AsyncStorage from '@react-native-async-storage/async-storage';

export type TrailRatings = Record<string, number>;
const KEY = '@ecotrek/trail-ratings';

export async function loadTrailRatings(): Promise<TrailRatings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Number(value) >= 1 && Number(value) <= 5)) as TrailRatings;
  } catch {
    return {};
  }
}

export async function saveTrailRating(trailId: string, stars: number): Promise<void> {
  const ratings = await loadTrailRatings();
  ratings[trailId] = Math.max(1, Math.min(5, Math.round(stars)));
  await AsyncStorage.setItem(KEY, JSON.stringify(ratings));
}

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
