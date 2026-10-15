import React from 'react';
import { Text, View } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppProvider, useApp } from '../context/AppContext';
import { AUSTIN_TRAILS, type TrailCatalogue } from '../constants/austinTrails';
import * as Catalogue from '../constants/austinTrails';
import { catalogueMatches, loadSavedTrailCatalogue, saveTrailCatalogue, validCatalogue } from '../services/trailCatalogueStorage';

let app: ReturnType<typeof useApp>;
function Probe() { app = useApp(); return <View><Text>CATALOGUE READY</Text></View>; }
const entry = () => ({ latitude: 30.2672, longitude: -97.7431, savedAt: Date.now(), region: 'Austin, TX', trails: AUSTIN_TRAILS });
const permission = Location.requestForegroundPermissionsAsync as jest.Mock;
const existing = Location.getForegroundPermissionsAsync as jest.Mock;
const fix = Location.getCurrentPositionAsync as jest.Mock;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

describe('instant, truthful trail browsing', () => {
  beforeEach(async () => { await AsyncStorage.clear(); existing.mockResolvedValue({ status: 'denied' }); permission.mockResolvedValue({ status: 'denied' }); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('has useful offline cards immediately, without claiming Austin is the current location', () => {
    const view = render(<AppProvider><Probe /></AppProvider>);
    expect(view.getByText('CATALOGUE READY')).toBeTruthy();
    expect(app.trails.length).toBe(AUSTIN_TRAILS.length);
    expect(app.trailsSource).toBe('collection');
    expect(app.usingFallbackLocation).toBe(true);
    expect(app.coords).toBeNull();
    expect(app.trailsLoading).toBe(false);
  });

  it('restores a device catalogue even before a GPS fix', async () => {
    await saveTrailCatalogue(entry());
    render(<AppProvider><Probe /></AppProvider>);
    await waitFor(() => expect(app.trailsSource).toBe('cached'));
    expect(app.trails.length).toBe(AUSTIN_TRAILS.length);
    expect(app.coords).toBeNull();
    expect(app.trailsLoading).toBe(false);
  });

  it('renders Austin cards while the live provider is unresolved; no retry is needed', async () => {
    permission.mockResolvedValue({ status: 'granted' });
    const lookup = deferred<TrailCatalogue>();
    const service = jest.spyOn(Catalogue, 'fetchNearbyTrails').mockReturnValue(lookup.promise);
    render(<AppProvider><Probe /></AppProvider>);
    await act(async () => { await app.requestLocation(); });
    await waitFor(() => expect(app.usingFallbackLocation).toBe(false));
    expect(app.trailsSource).toBe('bundled');
    expect(app.trailsLoading).toBe(false);
    expect(app.trails.length).toBeGreaterThan(0);
    expect(service).toHaveBeenCalledTimes(1);
    await act(async () => lookup.resolve({ trails: [], region: 'Austin', source: 'live' }));
    expect(app.trails.length).toBe(AUSTIN_TRAILS.length);
    expect(app.trailsError).toMatch(/saved list/);
  });

  it('a stale request cannot replace the catalogue for a newer location', async () => {
    permission.mockResolvedValue({ status: 'granted' });
    const first = deferred<TrailCatalogue>();
    const second = deferred<TrailCatalogue>();
    jest.spyOn(Catalogue, 'fetchNearbyTrails').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<AppProvider><Probe /></AppProvider>);
    await act(async () => { await app.requestLocation(); });
    await waitFor(() => expect(app.trailsSource).toBe('bundled'));
    fix.mockResolvedValueOnce({ coords: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() });
    await act(async () => { await app.requestLocation(); });
    const ny = { ...AUSTIN_TRAILS[0], id: 'ny-park', name: 'New York park', area: 'New York', startLat: 40.71, startLng: -74 };
    await act(async () => second.resolve({ trails: [ny], region: 'New York', source: 'live' }));
    expect(app.trails[0].id).toBe('ny-park');
    await act(async () => first.resolve({ trails: AUSTIN_TRAILS, region: 'Austin', source: 'bundled' }));
    expect(app.trails[0].id).toBe('ny-park');
    expect(app.trailsRegion).toBe('New York');
  });

  it('validates cached rows, bounds the cache to its area and stores only coarse search coordinates', async () => {
    expect(validCatalogue({ ...entry(), trails: [{}] })).toBe(false);
    expect(catalogueMatches(entry(), 40.7128, -74.006)).toBe(false);
    expect(catalogueMatches({ ...entry(), savedAt: Date.now() - 15 * 86400000 }, 30.26, -97.74)).toBe(false);
    expect(catalogueMatches(entry(), 30.26, -97.74)).toBe(true);
    await saveTrailCatalogue(entry());
    const restored = await loadSavedTrailCatalogue();
    expect(restored?.latitude).toBe(30.27);
    expect(restored?.longitude).toBe(-97.74);
    expect(restored?.trails.length).toBe(AUSTIN_TRAILS.length);
  });
});
