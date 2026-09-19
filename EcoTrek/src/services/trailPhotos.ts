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

function pagesToPhotos(data: any): Omit<TrailPhoto, 'kind'>[] {
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== 'object') return [];
  const out: Omit<TrailPhoto, 'kind'>[] = [];
  for (const key of Object.keys(pages)) {
    const p = pages[key];
    const info = Array.isArray(p?.imageinfo) ? p.imageinfo[0] : null;
    if (!info) continue;
    const title = String(p.title ?? '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
    const url: string | undefined = info.thumburl || info.url;
    if (!url) continue;
    // Photos only — skip maps, SVG signage, PDFs.
    if (!/\.(jpe?g|png|webp)$/i.test(String(info.url ?? url))) continue;
    if (/\b(map|logo|diagram|plaque|sign)\b/i.test(title)) continue;
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
    const key = p.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const photoSetCache = new Map<string, Promise<TrailPhotoSet>>();

/** Full photo set for the trail detail sheet. Cached per trail. */
export function getTrailPhotos(trail: Trail): Promise<TrailPhotoSet> {
  const cached = photoSetCache.get(trail.id);
  if (cached) return cached;

  const promise = (async (): Promise<TrailPhotoSet> => {
    const [near, named] = await Promise.all([
      geosearchPhotos(trail.startLat, trail.startLng, 3000, 20, 900),
      trail.name.length >= 6 ? searchPhotosByName(trail.name, 10, 900) : Promise.resolve([]),
    ]);
    const merged = dedupe([...named, ...near]).slice(0, 16);
    return classifyPhotos(merged);
  })().catch(() => ({ scenery: [], path: [], all: [] }));

  photoSetCache.set(trail.id, promise);
  return promise;
}

/*
 * Cover photos for list cards. One small geosearch per trail, but throttled
 * so opening the Trails tab does not fire two dozen requests at once.
 */
const coverCache = new Map<string, Promise<string | null>>();
let coverQueue: Promise<unknown> = Promise.resolve();
let coverInFlight = 0;
const COVER_MAX_CONCURRENT = 3;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  if (coverInFlight < COVER_MAX_CONCURRENT) {
    coverInFlight++;
    const p = task().finally(() => {
      coverInFlight--;
    });
    coverQueue = coverQueue.then(() => p.catch(() => undefined));
    return p;
  }
  const run = coverQueue.then(() => {
    coverInFlight++;
    return task().finally(() => {
      coverInFlight--;
    });
  });
  coverQueue = run.catch(() => undefined);
  return run;
}

/** Best single photo for a trail card, or null. Cached per trail. */
export function getTrailCover(trail: Trail): Promise<string | null> {
  const cached = coverCache.get(trail.id);
  if (cached) return cached;

  const promise = throttled(async () => {
    if (trail.imageUrl) return trail.imageUrl;
    const photos = await geosearchPhotos(trail.startLat, trail.startLng, 1500, 6, 640);
    if (photos.length === 0) return null;
    // Prefer a scenery-looking shot for the cover.
    const scenic = photos.find((p) => SCENERY_RE.test(p.title));
    return (scenic ?? photos[0]).url;
  }).catch(() => null);

  coverCache.set(trail.id, promise);
  return promise;
}
