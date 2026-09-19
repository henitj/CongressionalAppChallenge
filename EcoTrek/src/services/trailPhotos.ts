import type { Trail } from '../constants/austinTrails';

/**
 * Real photos for a trail, pulled from Wikimedia Commons.
 *
 * Why Commons: it is free, needs no API key, supports CORS (`origin=*`), and
 * — matching the rest of EcoTrek's data philosophy — the photos are real
 * pictures taken at real places, not AI renderings of a trail that may look
 * nothing like the ground truth. We geosearch around the trailhead and also
 * search by the trail's name, then split the results into two buckets:
 *
 *   • scenery — views, overlooks, waterfalls: where the trail can take you.
 *   • path    — the actual track underfoot, so people can judge the terrain
 *               (paved? dirt? stairs?) before they commit.
 *
 * Everything degrades gracefully: no network / no results simply means no
 * photo section, never an error.
 */

export type TrailPhoto = {
  /** Full-size (bounded-width) image URL. */
  url: string;
  /** Same image at thumbnail width. */
  thumbUrl: string;
  title: string;
  kind: 'scenery' | 'path';
};

export type TrailPhotoSet = {
  scenery: TrailPhoto[];
  path: TrailPhoto[];
  all: TrailPhoto[];
};

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/** Words that suggest a photo shows the track itself rather than a view. */
const PATH_RE =
  /\b(path|track|footpath|boardwalk|walkway|sidewalk|steps|stairs|staircase|bridge|underpass|tunnel|crossing|gate|trailhead|surface|gravel|paved)\b/i;

/** Words that suggest a photo shows scenery / a destination. */
const SCENERY_RE =
  /\b(view|vista|overlook|lookout|panorama|summit|peak|falls|waterfall|cascade|lake|river|creek|pond|spring|canyon|cliff|bluff|meadow|sunset|sunrise|skyline|scenic|bloom|flowers?|autumn|foliage)\b/i;

const FETCH_TIMEOUT_MS = 9000;

async function fetchJSON(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Exported for tests. Converts a Commons API response into photo entries.
 *
 * Two things learned from the live API that are easy to get wrong:
 *   • `query.pages` is keyed by pageid, and JS iterates numeric-like keys in
 *     ascending pageid order — NOT relevance. The API's relevance lives in
 *     each page's `index` field, so we sort by it or the "best" photo would
 *     be whichever was uploaded first.
 *   • URLs can carry a query string (`....JPG?utm_source=...`), so the
 *     file-type check must not anchor the extension to the end of the URL.
 */
export function pagesToPhotos(data: any): Omit<TrailPhoto, 'kind'>[] {
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== 'object') return [];
  const entries = Object.keys(pages)
    .map((key) => pages[key])
    .sort(
      (a, b) =>
        (Number.isFinite(Number(a?.index)) ? Number(a.index) : 1e9) -
        (Number.isFinite(Number(b?.index)) ? Number(b.index) : 1e9)
    );

  const out: Omit<TrailPhoto, 'kind'>[] = [];
  for (const p of entries) {
    const info = Array.isArray(p?.imageinfo) ? p.imageinfo[0] : null;
    if (!info) continue;
    const title = String(p.title ?? '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
    const url: string | undefined = info.thumburl || info.url;
    if (!url) continue;
    // Photos only — skip maps, SVG signage, PDFs. The URL may end in a
    // query string, so match the extension anywhere before it.
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(String(info.url ?? url))) continue;
    if (/\b(map|logo|diagram|plaque|signs?|signage|rules|marker|poster)\b/i.test(title)) continue;
    out.push({ url, thumbUrl: url, title });
  }
  return out;
}

function commonsUrl(params: Record<string, string>): string {
  const base: Record<string, string> = {
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'url',
    ...params,
  };
  return `${COMMONS_API}?${Object.entries(base)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
}

async function geosearchPhotos(
  lat: number,
  lon: number,
  radiusM: number,
  limit: number,
  width: number
): Promise<Omit<TrailPhoto, 'kind'>[]> {
  const data = await fetchJSON(
    commonsUrl({
      generator: 'geosearch',
      ggscoord: `${lat.toFixed(5)}|${lon.toFixed(5)}`,
      ggsradius: String(radiusM),
      ggslimit: String(limit),
      ggsnamespace: '6',
      iiurlwidth: String(width),
    })
  );
  return pagesToPhotos(data);
}

async function searchPhotosByName(name: string, limit: number, width: number) {
  const data = await fetchJSON(
    commonsUrl({
      generator: 'search',
      gsrsearch: name,
      gsrnamespace: '6',
      gsrlimit: String(limit),
      iiurlwidth: String(width),
    })
  );
  return pagesToPhotos(data);
}

/**
 * Splits photos into scenery vs path. Keyword hits win; anything ambiguous
 * goes to whichever bucket is emptier so both sections have something to
 * show whenever any photos exist at all.
 */
export function classifyPhotos(photos: Omit<TrailPhoto, 'kind'>[]): TrailPhotoSet {
  const scenery: TrailPhoto[] = [];
  const path: TrailPhoto[] = [];
  const ambiguous: Omit<TrailPhoto, 'kind'>[] = [];

  for (const p of photos) {
    const isScenery = SCENERY_RE.test(p.title);
    const isPath = PATH_RE.test(p.title);
    if (isScenery && !isPath) scenery.push({ ...p, kind: 'scenery' });
    else if (isPath && !isScenery) path.push({ ...p, kind: 'path' });
    else ambiguous.push(p);
  }

  for (const p of ambiguous) {
    if (path.length < scenery.length) path.push({ ...p, kind: 'path' });
    else scenery.push({ ...p, kind: 'scenery' });
  }

  return { scenery, path, all: [...scenery, ...path] };
}

function dedupe(photos: Omit<TrailPhoto, 'kind'>[]): Omit<TrailPhoto, 'kind'>[] {
  const seen = new Set<string>();
  return photos.filter((p) => {
    const key = p.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Prefer photos whose title is actually about this trail, not just nearby. */
function trailWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !['trail', 'park', 'loop', 'hike', 'bike'].includes(word));
}

function relevanceForTrail(photo: Omit<TrailPhoto, 'kind'>, trail: Trail): number {
  const title = photo.title.toLowerCase();
  const words = trailWords(trail.name);
  const nameHits = words.filter((word) => title.includes(word)).length;
  const scenic = SCENERY_RE.test(photo.title) ? 2 : 0;
  const path = PATH_RE.test(photo.title) ? 1 : 0;
  return nameHits * 10 + scenic + path;
}

const photoSetCache = new Map<string, Promise<TrailPhotoSet>>();

/**
 * Full photo set for the trail detail sheet. Successes are cached per trail;
 * an empty result (offline, API blip) is NOT kept, so reopening the trail
 * retries instead of hiding photos until the app restarts.
 */
export function getTrailPhotos(trail: Trail): Promise<TrailPhotoSet> {
  const cached = photoSetCache.get(trail.id);
  if (cached) return cached;

  // A configured API can supply an approved/admin-curated set from
  // `trail_photos`. Use it first so a database editor can replace a bad
  // Commons result without shipping a new app build.
  const approved = Array.isArray(trail.photos)
    ? trail.photos.filter((photo) => photo && /^https?:\/\//i.test(photo.url))
    : [];
  if (approved.length > 0) {
    const set: TrailPhotoSet = {
      scenery: approved.filter((photo) => photo.kind === 'scenery'),
      path: approved.filter((photo) => photo.kind === 'path'),
      all: approved,
    };
    const promise = Promise.resolve(set);
    photoSetCache.set(trail.id, promise);
    return promise;
  }

  const promise = (async (): Promise<TrailPhotoSet> => {
    const [near, named] = await Promise.all([
      geosearchPhotos(trail.startLat, trail.startLng, 3000, 20, 900),
      trail.name.length >= 6 ? searchPhotosByName(trail.name, 10, 900) : Promise.resolve([]),
    ]);
    const merged = dedupe([...named, ...near])
      .sort((a, b) => relevanceForTrail(b, trail) - relevanceForTrail(a, trail))
      .slice(0, 16);
    const set = classifyPhotos(merged);
    if (set.all.length === 0) photoSetCache.delete(trail.id);
    return set;
  })().catch(() => {
    photoSetCache.delete(trail.id);
    return { scenery: [], path: [], all: [] };
  });

  photoSetCache.set(trail.id, promise);
  return promise;
}

/*
 * Cover photos for list cards. One small geosearch per trail, but throttled
 * so opening the Trails tab does not fire two dozen requests at once.
 */
const coverCache = new Map<string, Promise<string | null>>();
const COVER_MAX_CONCURRENT = 3;

/**
 * Simple promise semaphore: at most COVER_MAX_CONCURRENT tasks run at once,
 * the rest wait in FIFO order and start the moment a slot frees up (they do
 * not serialise behind the whole queue). Exported for tests.
 */
let coverInFlight = 0;
const coverWaiters: (() => void)[] = [];

export async function throttled<T>(task: () => Promise<T>): Promise<T> {
  if (coverInFlight >= COVER_MAX_CONCURRENT) {
    // Queue up. The finishing task hands its slot to us directly (the count
    // is not decremented in between), so a newcomer can never race past a
    // queued waiter and push concurrency above the cap.
    await new Promise<void>((resolve) => coverWaiters.push(resolve));
  } else {
    coverInFlight++;
  }
  try {
    return await task();
  } finally {
    const next = coverWaiters.shift();
    if (next) next();
    else coverInFlight--;
  }
}

/**
 * Best single photo for a trail card, or null. Found covers are cached per
 * trail; a null (offline, API blip) is dropped from the cache so the next
 * visit to the list retries instead of staying photo-less until restart.
 */
export function getTrailCover(trail: Trail): Promise<string | null> {
  const cached = coverCache.get(trail.id);
  if (cached) return cached;

  const promise = throttled(async () => {
    if (trail.imageUrl) return trail.imageUrl;
    const approved = Array.isArray(trail.photos)
      ? trail.photos.find((photo) => /^https?:\/\//i.test(photo.url))
      : null;
    if (approved) return approved.thumbUrl || approved.url;
    const [named, nearby] = await Promise.all([
      trail.name.length >= 6 ? searchPhotosByName(trail.name, 6, 640) : Promise.resolve([]),
      geosearchPhotos(trail.startLat, trail.startLng, 1500, 6, 640),
    ]);
    const photos = dedupe([...named, ...nearby]).sort(
      (a, b) =>
        relevanceForTrail(b, trail) + (SCENERY_RE.test(b.title) ? 3 : 0) -
        (relevanceForTrail(a, trail) + (SCENERY_RE.test(a.title) ? 3 : 0))
    );
    if (photos.length === 0) return null;
    // Prefer the best-matching scenery shot for the cover. A nearby photo is
    // still better than a broken card, but an unrelated scenic image cannot
    // outrank a photo whose title names this trail.
    return photos[0].thumbUrl || photos[0].url;
  })
    .catch(() => null)
    .then((url) => {
      if (url == null) coverCache.delete(trail.id);
      return url;
    });

  coverCache.set(trail.id, promise);
  return promise;
}
