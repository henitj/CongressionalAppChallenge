import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trail } from '../constants/austinTrails';
import { haversineMiles } from './location';

// Public catalogue + coarse search area, device-only; never a GPS track.
const KEY = '@ecotrek/trail-catalogue-v1';
export type SavedTrailCatalogue = { latitude: number; longitude: number; region: string | null; savedAt: number; trails: Trail[] };
const stringList = (value: unknown) => value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
function validTrail(value: unknown): value is Trail {
  const trail = value as Trail | null;
  return !!trail && typeof trail === 'object'
    && typeof trail.id === 'string' && !!trail.id && !['__proto__', 'constructor', 'prototype'].includes(trail.id)
    && typeof trail.slug === 'string' && typeof trail.name === 'string' && !!trail.name
    && typeof trail.area === 'string' && typeof trail.description === 'string'
    && Array.isArray(trail.safetyTips) && stringList(trail.safetyTips)
    && ['hike', 'bike', 'mixed'].includes(trail.type) && ['Easy', 'Moderate', 'Hard'].includes(trail.difficulty)
    && Number.isFinite(trail.distanceMiles) && trail.distanceMiles >= 0
    && Number.isFinite(trail.startLat) && Math.abs(trail.startLat) <= 90
    && Number.isFinite(trail.startLng) && Math.abs(trail.startLng) <= 180
    && stringList(trail.plants) && stringList(trail.animals)
    && (trail.imageUrl === undefined || typeof trail.imageUrl === 'string')
    && (trail.photos === undefined || (Array.isArray(trail.photos) && trail.photos.every((photo) => !!photo && typeof photo.url === 'string' && typeof photo.thumbUrl === 'string' && typeof photo.title === 'string')));
}
export function validCatalogue(value: unknown): value is SavedTrailCatalogue {
  const entry = value as SavedTrailCatalogue | null;
  return !!entry && typeof entry === 'object'
    && Number.isFinite(entry.latitude) && Math.abs(entry.latitude) <= 90
    && Number.isFinite(entry.longitude) && Math.abs(entry.longitude) <= 180
    && Number.isFinite(entry.savedAt) && entry.savedAt > 0
    && (entry.region === null || typeof entry.region === 'string')
    && Array.isArray(entry.trails) && entry.trails.length > 0 && entry.trails.length <= 100
    && entry.trails.every(validTrail);
}
export async function loadSavedTrailCatalogue(): Promise<SavedTrailCatalogue | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return validCatalogue(parsed) ? parsed : null;
  } catch { return null; }
}
export async function saveTrailCatalogue(entry: SavedTrailCatalogue): Promise<void> {
  if (!validCatalogue(entry)) return;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...entry, latitude: Math.round(entry.latitude * 100) / 100, longitude: Math.round(entry.longitude * 100) / 100 }));
  } catch { /* Browsing still works when device storage is full. */ }
}
export function catalogueMatches(entry: SavedTrailCatalogue | null, latitude: number, longitude: number): boolean {
  return !!entry && Date.now() - entry.savedAt <= 14 * 86400000 && entry.savedAt <= Date.now() + 60000
    && haversineMiles({ latitude, longitude }, { latitude: entry.latitude, longitude: entry.longitude }) <= 12;
}
