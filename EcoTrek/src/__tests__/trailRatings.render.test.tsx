import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { TrailRatingControls } from '../components/TrailRatingSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadTrailRatings, removeTrailRating, saveTrailRating, trailPreferenceScore } from '../services/trailRatings';
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

  it('serializes concurrent ratings for different trails without losing either', async () => {
    await Promise.all([saveTrailRating('creek', 2), saveTrailRating('ridge', 5), saveTrailRating('meadow', 3)]);
    expect(await loadTrailRatings()).toEqual({ creek: 2, ridge: 5, meadow: 3 });
    await removeTrailRating('ridge');
    expect(await loadTrailRatings()).toEqual({ creek: 2, meadow: 3 });
  });

  it('shows the saved selection, accepts an edit and lets the user clear it', async () => {
    await saveTrailRating('creek', 4);
    const view = render(<TrailRatingControls trailId="creek" />);
    await waitFor(() => expect(view.getByLabelText('4 stars').props.accessibilityState.checked).toBe(true));
    fireEvent.press(view.getByLabelText('5 stars'));
    await waitFor(() => expect(view.getByText('5 out of 5 · saved')).toBeTruthy());
    expect(await loadTrailRatings()).toEqual({ creek: 5 });
    fireEvent.press(view.getByLabelText('Remove your rating'));
    await waitFor(() => expect(view.getByText('Rating removed.')).toBeTruthy());
    expect(await loadTrailRatings()).toEqual({});
  });

  it('does not auto-dismiss or pretend a failed write succeeded', async () => {
    const write = (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('full'));
    const view = render(<TrailRatingControls trailId="creek" />);
    await act(async () => { fireEvent.press(view.getByLabelText('3 stars')); });
    expect(view.getByText('Couldn’t save your rating. Tap a star to try again.')).toBeTruthy();
    expect(view.queryByText('3 out of 5 · saved')).toBeNull();
    fireEvent.press(view.getByLabelText('5 stars'));
    await waitFor(() => expect(view.getByText('5 out of 5 · saved')).toBeTruthy());
    expect(write).toHaveBeenCalled();
    expect(await loadTrailRatings()).toEqual({ creek: 5 });
  });

  it('rapid star edits save the last choice and switching trails resets the selection', async () => {
    const view = render(<TrailRatingControls trailId="creek" />);
    fireEvent.press(view.getByLabelText('1 star'));
    fireEvent.press(view.getByLabelText('5 stars'));
    await waitFor(() => expect(view.getByText('5 out of 5 · saved')).toBeTruthy());
    expect(await loadTrailRatings()).toEqual({ creek: 5 });
    view.rerender(<TrailRatingControls trailId="ridge" />);
    await waitFor(() => expect(view.getByLabelText('5 stars').props.accessibilityState.checked).toBe(false));
  });

  it('keeps ratings private to a profile and claims legacy device ratings once', async () => {
    await saveTrailRating('old-creek', 4);
    expect(await loadTrailRatings('alex')).toEqual({ 'old-creek': 4 });
    expect(await loadTrailRatings('jordan')).toEqual({});
    await saveTrailRating('ridge', 5, 'jordan');
    expect(await loadTrailRatings('alex')).toEqual({ 'old-creek': 4 });
    expect(await loadTrailRatings('jordan')).toEqual({ ridge: 5 });
    expect(await AsyncStorage.getItem('@ecotrek/trail-ratings')).toBeNull();
  });

  it('rejects non-finite or prototype-shaped ratings', async () => {
    await expect(saveTrailRating('creek', NaN)).rejects.toThrow();
    await expect(saveTrailRating('__proto__', 4)).rejects.toThrow();
    expect(await loadTrailRatings()).toEqual({});
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
