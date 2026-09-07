import type { Trail } from '../constants/austinTrails';
import { haversineMiles } from './geo';

/**
 * Live trail lookup for the US, Canada and Mexico.
 *
 * EcoTrek used to ship a fixed Austin catalogue. That meant a walker in
 * New York opened Trails and saw Lady Bird Lake. This module looks up real
 * named hiking routes, parks and cycleways around the phone, using
 * OpenStreetMap (no API key, works without our backend).
 *
 * Service area is the United States, Canada and Mexico. Anywhere else we
 * return an empty list instead of inventing or shipping Austin trails.
 *
 * Austin's bundled list is still used when the phone is actually in the
 * Austin area (the bundled cards are richer). Without a GPS fix we wait —
 * we do not pretend the user is in Texas.
 *
 * A language model is deliberately not the source of the catalogue — models
 * invent trails. OSM reports trails that exist.
 */

export const AUSTIN_CENTER = { latitude: 30.2672, longitude: -97.7431 };

/** Inside this radius we treat the user as an Austin walker. */
export const AUSTIN_RADIUS_MI = 40;

/** ISO country codes EcoTrek serves. Puerto Rico counts as the US. */
export const SERVICE_COUNTRY_CODES = ['us', 'ca', 'mx', 'pr'] as const;

export type PlaceInfo = {
  name: string | null;
  countryCode: string | null;
  country: string | null;
};

export function isSupportedCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return (SERVICE_COUNTRY_CODES as readonly string[]).includes(code.toLowerCase());
}

/**
 * Cheap reject for points that are clearly not in North America, so we do
 * not spend an Overpass round-trip on London or Tokyo. Hawaii, Alaska,
 * Puerto Rico, northern Canada and southern Mexico are included.
 */
export function inServiceBbox(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat >= 18.5 && lat <= 22.6 && lon >= -160.6 && lon <= -154.4) return true; // Hawaii
  if (lat >= 51 && lat <= 72 && lon >= -170 && lon <= -129) return true; // Alaska
  if (lat >= 14.5 && lat <= 83.5 && lon >= -141 && lon <= -52) return true; // CONUS + Canada + Mexico + PR
  return false;
}

/**
 * Nominatim country_code wins when we have it (drops Cuba, Greenland, etc.
 * that sit near the bbox). If the geocoder is down we fall back to the bbox
 * so a New Yorker is not locked out of trails because OSM reverse failed.
 */
export function isInServiceArea(lat: number, lon: number, countryCode?: string | null): boolean {
  if (countryCode) return isSupportedCountry(countryCode);
  return inServiceBbox(lat, lon);
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'EcoTrek/1.0 (congressional-app-challenge)',
};

const MAX_TRAILS = 24;
const CACHE_MS = 30 * 60 * 1000;

type OsmElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

export type TrailSource = 'bundled' | 'live' | 'unsupported' | 'need-location';

export type TrailCatalogue = {
  trails: Trail[];
  region: string | null;
  source: TrailSource;
};

type CacheEntry = { key: string; at: number; catalogue: TrailCatalogue };
let cache: CacheEntry | null = null;

export function isNearAustin(lat: number, lon: number): boolean {
  return haversineMiles({ latitude: lat, longitude: lon }, AUSTIN_CENTER) <= AUSTIN_RADIUS_MI;
}

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

async function fetchJSON(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** OSM `distance` tags are usually kilometres; a bare number under 80 is treated as km. */
export function parseOsmDistanceMiles(raw?: string | null): number | null {
  if (!raw) return null;
  const m = String(raw).replace(',', '.').match(/([\d.]+)\s*(km|kilometre|kilometer|kilometres|mi|mile|miles|m)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'm') return Math.round((n / 1609.34) * 10) / 10;
  if (unit.startsWith('mi')) return Math.round(n * 10) / 10;
  // kilometres, or an unlabelled figure that is almost certainly km
  return Math.round(n * 0.621371 * 10) / 10;
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function coordsOf(el: OsmElement): { lat: number; lon: number } | null {
  const lat = el.center?.lat ?? el.lat;
  const lon = el.center?.lon ?? el.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function trailType(tags: Record<string, string>): Trail['type'] {
  const route = (tags.route ?? '').toLowerCase();
  const highway = (tags.highway ?? '').toLowerCase();
  if (route === 'bicycle' || highway === 'cycleway') return 'bike';
  if (route === 'hiking' || route === 'foot' || route === 'walking') return 'hike';
  if (highway === 'path' || highway === 'footway') return 'hike';
  if (tags.leisure) return 'mixed';
  return 'mixed';
}

function difficultyOf(tags: Record<string, string>): Trail['difficulty'] {
  const sac = (tags.sac_scale ?? '').toLowerCase();
  if (sac.includes('demanding') || sac.includes('alpine') || sac === 'difficult_alpine_hiking') return 'Hard';
  if (sac.includes('mountain_hiking') || sac === 'hiking_plus') return 'Moderate';
  const mtb = Number(tags['mtb:scale']);
  if (Number.isFinite(mtb) && mtb >= 3) return 'Hard';
  if (Number.isFinite(mtb) && mtb >= 1) return 'Moderate';
  if ((tags.route ?? '') === 'hiking' && !tags.leisure) return 'Moderate';
  return 'Easy';
}

function yesNoTag(v?: string): boolean | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (['yes', 'true', 'leashed', 'designated', 'permissive'].includes(s)) return true;
  if (['no', 'false', 'private'].includes(s)) return false;
  return undefined;
}

function defaultMiles(type: Trail['type'], tags: Record<string, string>): number {
  if (tags.leisure) return 1.5;
  if (type === 'bike') return 6;
  return 3;
}

function safetyTips(tags: Record<string, string>, type: Trail['type']): string[] {
  const tips = [
    'Tell someone your route and when you expect to be back.',
    'Carry water, especially in heat.',
    'Conditions change — check locally before you go.',
  ];
  const sac = (tags.sac_scale ?? '').toLowerCase();
  if (sac.includes('demanding') || sac.includes('alpine')) {
    tips.unshift('This is a serious mountain route. Turn back if the weather turns.');
  }
  if (type === 'bike') {
    tips.push('Call your pass when overtaking — many of these paths are shared.');
  }
  return tips.slice(0, 4);
}

function descriptionFor(name: string, area: string, type: Trail['type'], difficulty: Trail['difficulty'], tags: Record<string, string>): string {
  if (tags.description) return tags.description.slice(0, 280);
  if (tags.note) return tags.note.slice(0, 280);
  const kind =
    type === 'bike' ? 'bike route' : type === 'hike' ? 'walking trail' : 'park loop';
  const where = area && area !== 'Nearby' ? ` in ${area}` : '';
  const extra = tags.leisure === 'nature_reserve' ? ' A nature reserve — stay on marked paths.' : '';
  return `${name} is a ${difficulty.toLowerCase()} ${kind}${where}.${extra}`;
}

export function trailFromOsmElement(
  el: OsmElement,
  userLat: number,
  userLon: number,
  area: string
): Trail | null {
  const tags = el.tags ?? {};
  const name = (tags.name ?? '').trim();
  if (!name || name.length < 3) return null;
  // Skip things that are clearly not a walk or ride.
  const skip = (tags.amenity ?? '') + (tags.building ?? '') + (tags.tourism ?? '');
  if (/\b(parking|toilet|restaurant|cafe|hotel|museum|school)\b/i.test(skip)) return null;

  const coords = coordsOf(el);
  if (!coords) return null;

  const type = trailType(tags);
  const difficulty = difficultyOf(tags);
  const osmId = `${el.type ?? 'el'}-${el.id ?? slugPart(name)}`;
  const miles =
    parseOsmDistanceMiles(tags.distance) ??
    parseOsmDistanceMiles(tags.length) ??
    defaultMiles(type, tags);

  const ascent = parseOsmDistanceMiles(tags.ascent)
    ? Math.round((parseOsmDistanceMiles(tags.ascent) as number) * 5280)
    : Number(tags.ele) || undefined;

  const pet = yesNoTag(tags.dog) ?? yesNoTag(tags['dog:leash'] ? 'yes' : '') ?? true;
  const toilets = yesNoTag(tags.toilets) ?? false;
  const water = yesNoTag(tags.drinking_water) ?? false;
  const paved = /asphalt|paved|concrete|compacted/i.test(tags.surface ?? '');
  const isPark = !!tags.leisure;

  const trail: Trail = {
    id: `osm-${osmId}`,
    slug: `${slugPart(name) || 'trail'}-${osmId}`,
    name,
    type,
    distanceMiles: Math.max(0.3, Math.min(40, miles)),
    difficulty,
    area: tags['addr:city'] || tags['addr:suburb'] || tags['is_in:city'] || area || 'Nearby',
    description: descriptionFor(name, area, type, difficulty, tags),
    safetyTips: safetyTips(tags, type),
    rating: 4.4,
    petFriendly: pet,
    familyFriendly: isPark || difficulty === 'Easy',
    strollerFriendly: paved || (isPark && difficulty === 'Easy'),
    restroomsAvailable: toilets,
    waterStations: water,
    elevationGainFt: typeof ascent === 'number' && Number.isFinite(ascent) ? Math.round(ascent) : undefined,
    estimatedMinutes: Math.max(20, Math.round(miles * (type === 'bike' ? 6 : 22))),
    ecoPoints: difficulty === 'Hard' ? 30 : difficulty === 'Moderate' ? 20 : 12,
    startLat: coords.lat,
    startLng: coords.lon,
    isLoop: tags.roundtrip === 'yes' || tags.loop === 'yes' || isPark,
    distanceFromUserMi: haversineMiles(
      { latitude: userLat, longitude: userLon },
      { latitude: coords.lat, longitude: coords.lon }
    ),
  };
  return trail;
}

function scoreTrail(t: Trail): number {
  let s = 0;
  if (t.type === 'hike') s += 3;
  if (t.type === 'bike') s += 2;
  if (t.isLoop) s += 1;
  if ((t.distanceFromUserMi ?? 99) < 3) s += 4;
  else if ((t.distanceFromUserMi ?? 99) < 8) s += 2;
  if (t.distanceMiles >= 1 && t.distanceMiles <= 12) s += 2;
  return s;
}

function dedupe(trails: Trail[]): Trail[] {
  const byKey = new Map<string, Trail>();
  for (const t of trails) {
    const key = t.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const existing = byKey.get(key);
    if (!existing || (t.distanceFromUserMi ?? 99) < (existing.distanceFromUserMi ?? 99)) {
      byKey.set(key, t);
    }
  }
  return [...byKey.values()];
}

export function mergeTrailLists(primary: Trail[], extra: Trail[]): Trail[] {
  const byId = new Map<string, Trail>();
  for (const t of extra) byId.set(t.id, t);
  // Primary wins on id collision (bundled Austin cards beat a thin OSM stub).
  for (const t of primary) byId.set(t.id, t);
  return [...byId.values()];
}

export async function fetchPlace(lat: number, lon: number): Promise<PlaceInfo> {
  const empty: PlaceInfo = { name: null, countryCode: null, country: null };
  try {
    const url =
      `${NOMINATIM_URL}?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}` +
      `&format=json&zoom=10&addressdetails=1`;
    const data = await fetchJSON(url, 6000);
    const a = data?.address ?? {};
    const nameRaw =
      a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || null;
    const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;
    const countryCode =
      typeof a.country_code === 'string' && a.country_code.trim()
        ? a.country_code.trim().toLowerCase()
        : null;
    const country = typeof a.country === 'string' && a.country.trim() ? a.country.trim() : null;
    return { name, countryCode, country };
  } catch {
    return empty;
  }
}

export async function fetchPlaceName(lat: number, lon: number): Promise<string | null> {
  return (await fetchPlace(lat, lon)).name;
}

function overpassQuery(lat: number, lon: number): string {
  const la = lat.toFixed(5);
  const lo = lon.toFixed(5);
  return `
[out:json][timeout:18];
(
  relation["route"~"^(hiking|foot|walking|bicycle)$"]["name"](around:25000,${la},${lo});
  way["route"~"^(hiking|foot|walking)$"]["name"](around:15000,${la},${lo});
  relation["leisure"~"^(park|nature_reserve|garden)$"]["name"](around:12000,${la},${lo});
  way["leisure"~"^(park|nature_reserve)$"]["name"](around:8000,${la},${lo});
  way["highway"="cycleway"]["name"](around:8000,${la},${lo});
);
out center tags 50;
`.trim();
}

export async function fetchOsmTrails(lat: number, lon: number, area: string): Promise<Trail[]> {
  const query = overpassQuery(lat, lon);
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const data = await fetchJSON(url, 20000);
      const elements: OsmElement[] = Array.isArray(data?.elements) ? data.elements : [];
      const mapped = elements
        .map((el) => trailFromOsmElement(el, lat, lon, area))
        .filter((t): t is Trail => t != null);
      return dedupe(mapped)
        .sort((a, b) => scoreTrail(b) - scoreTrail(a) || (a.distanceFromUserMi ?? 0) - (b.distanceFromUserMi ?? 0))
        .slice(0, MAX_TRAILS);
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return [];
}

export function withDistances(trails: Trail[], lat: number, lon: number): Trail[] {
  return trails
    .map((t) => ({
      ...t,
      distanceFromUserMi: haversineMiles(
        { latitude: lat, longitude: lon },
        { latitude: t.startLat, longitude: t.startLng }
      ),
    }))
    .sort((a, b) => (a.distanceFromUserMi ?? 0) - (b.distanceFromUserMi ?? 0));
}

export function readTrailCache(lat: number, lon: number): TrailCatalogue | null {
  if (!cache) return null;
  if (cache.key !== cacheKey(lat, lon)) return null;
  if (Date.now() - cache.at > CACHE_MS) return null;
  return cache.catalogue;
}

export function writeTrailCache(lat: number, lon: number, catalogue: TrailCatalogue) {
  cache = { key: cacheKey(lat, lon), at: Date.now(), catalogue };
}
