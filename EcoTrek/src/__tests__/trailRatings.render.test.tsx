import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadTrailRatings, saveTrailRating, trailPreferenceScore } from '../services/trailRatings';
import { retainRecentActivities } from '../services/activityRetention';

describe('trail ratings', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('persists ratings and clamps invalid star values', async () => {
    await saveTrailRating('creek', 4);
    await saveTrailRating('ridge', 99);
    expect(await loadTrailRatings()).toEqual({ creek: 4, ridge: 5 });
  });

  it('falls back to an empty preference set when storage is malformed', async () => {
    await AsyncStorage.setItem('@ecotrek/trail-ratings', '{broken');
    expect(await loadTrailRatings()).toEqual({});
  });

  it('promotes trails similar to a highly rated completion', () => {
    const catalogue = [
      { id: 'liked', type: 'hike', difficulty: 'Easy' },
      { id: 'similar', type: 'hike', difficulty: 'Easy' },
      { id: 'different', type: 'bike', difficulty: 'Hard' },
    ];
    const ratings = { liked: 5 };
    expect(trailPreferenceScore(catalogue[1], catalogue, ratings)).toBeGreaterThan(
      trailPreferenceScore(catalogue[2], catalogue, ratings)
    );
  });

  it('pushes down trails similar to a poorly rated completion', () => {
    const catalogue = [
      { id: 'disliked', type: 'bike', difficulty: 'Hard' },
      { id: 'similar', type: 'bike', difficulty: 'Hard' },
    ];
    expect(trailPreferenceScore(catalogue[1], catalogue, { disliked: 1 })).toBeLessThan(0);
  });

  it('removes malformed and more-than-one-year-old activity records', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 2_000_000_000_000;
    const records = [
      { id: 'week', startedAt: now - 7 * day },
      { id: 'year-edge', startedAt: now - 365 * day },
      { id: 'expired', startedAt: now - 366 * day },
      { id: 'broken', startedAt: Number.NaN },
    ];
    expect(retainRecentActivities(records, now).map((item) => item.id)).toEqual(['week', 'year-edge']);
  });
});
