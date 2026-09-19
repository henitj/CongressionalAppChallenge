import type { Trail } from '../constants/austinTrails';
import { api, isBackendConfigured, ROUTES } from './api';

/**
 * AI-enriched trail intel for the detail sheet.
 *
 * The catalogue rows (especially the live OSM ones) are thin: a name, a
 * length, maybe an elevation tag. This module asks the backend's language
 * model to fill in the parts a hiker actually wants before setting off —
 * what the terrain underfoot is like, what scenery the trail leads to, and
 * an honest time estimate.
 *
 * Grounding rules match the rest of the app: the model only ever REPHRASES
 * and EXTENDS facts we hand it (name, area, distance, difficulty, climb).
 * The numeric stats shown in the UI always come from the catalogue, never
 * from the model, so it cannot invent a distance. Without a backend the
 * sheet falls back to figures derived on-device and simply shows less prose.
 */

export type TrailIntel = {
  /** One-paragraph "what to expect" written by the model (or derived). */
  summary: string;
  /** What the surface / terrain is like underfoot. */
  terrain: string;
  /** Where the trail can take you — overlooks, water, summits. */
  highlights: string;
  /** True when a language model produced the prose. */
  fromAI: boolean;
};

/** Average moving time, derived from length + climb (Naismith-ish). */
export function estimateMinutes(t: Trail): number {
  if (t.estimatedMinutes) return t.estimatedMinutes;
  const base = t.distanceMiles * (t.type === 'bike' ? 6 : 20);
  const climbPenalty = ((t.elevationGainFt ?? 0) / 1000) * 30;
  return Math.max(15, Math.round(base + climbPenalty));
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Rough climb estimate when OSM gave us nothing, from difficulty + length. */
export function estimateElevationFt(t: Trail): number {
  if (t.elevationGainFt != null) return t.elevationGainFt;
  const perMile = t.difficulty === 'Hard' ? 250 : t.difficulty === 'Moderate' ? 120 : 40;
  return Math.round((t.distanceMiles * perMile) / 10) * 10;
}

function localIntel(t: Trail): TrailIntel {
  const surface =
    t.strollerFriendly
      ? 'Mostly smooth, paved or hard-packed surface — fine in regular sneakers.'
      : t.difficulty === 'Hard'
      ? 'Expect rough, uneven ground with rocky or rooty stretches. Proper footwear matters here.'
      : t.difficulty === 'Moderate'
      ? 'A natural-surface track — dirt and gravel with some uneven footing.'
      : 'An easy natural surface most walkers will find comfortable.';

  const highlights = t.waterStations
    ? 'Watch for water access along the way — creekside stretches are usually the prettiest parts.'
    : t.elevationGainFt && t.elevationGainFt > 400
    ? 'The climb pays off: higher ground on this route usually means views back over the area.'
    : 'A good option for an unhurried outing — the scenery is in the green, not the summit.';

  return {
    summary: `${t.name} is ${t.distanceMiles} mi of ${t.difficulty.toLowerCase()} ${
      t.type === 'bike' ? 'riding' : 'walking'
    }${t.isLoop ? ' as a loop' : ''} in ${t.area}. Plan around ${formatMinutes(
      estimateMinutes(t)
    )} at a normal pace.`,
    terrain: surface,
    highlights,
    fromAI: false,
  };
}

const intelCache = new Map<string, Promise<TrailIntel>>();

/**
 * Returns intel for a trail. Instant local answer if no backend; otherwise a
 * model-written version grounded in the catalogue facts. Never rejects.
 */
export function getTrailIntel(trail: Trail): Promise<TrailIntel> {
  const cached = intelCache.get(trail.id);
  if (cached) return cached;

  const promise = (async (): Promise<TrailIntel> => {
    const fallback = localIntel(trail);
    if (!isBackendConfigured()) return fallback;

    const res = await api.post<{ text: string }>(ROUTES.assistant, {
      question:
        'Write three short sections about this trail for a hiker, separated by the lines ' +
        '"TERRAIN:" and "HIGHLIGHTS:". First an overall 2-sentence summary of what to expect, ' +
        'then TERRAIN: one or two sentences on what the surface underfoot is like, ' +
        'then HIGHLIGHTS: one or two sentences on the scenery and where the trail can take you. ' +
        'Use only the data provided. No headings other than those two markers, no bullet points.',
      context: {
        trail: {
          name: trail.name,
          area: trail.area,
          type: trail.type,
          distanceMiles: trail.distanceMiles,
          difficulty: trail.difficulty,
          elevationGainFt: trail.elevationGainFt ?? null,
          estimatedMinutes: estimateMinutes(trail),
          isLoop: !!trail.isLoop,
          strollerFriendly: !!trail.strollerFriendly,
          waterStations: !!trail.waterStations,
          description: trail.description,
        },
      },
    });

    if (!res.ok || !res.data?.text) return fallback;

    const text = res.data.text;
    const terrainSplit = text.split(/\n?TERRAIN:\s*/i);
    const summary = (terrainSplit[0] ?? '').trim();
    const rest = terrainSplit[1] ?? '';
    const highlightSplit = rest.split(/\n?HIGHLIGHTS:\s*/i);
    const terrain = (highlightSplit[0] ?? '').trim();
    const highlights = (highlightSplit[1] ?? '').trim();

    if (!summary) return fallback;
    return {
      summary,
      terrain: terrain || fallback.terrain,
      highlights: highlights || fallback.highlights,
      fromAI: true,
    };
  })().catch(() => localIntel(trail));

  intelCache.set(trail.id, promise);
  return promise;
}
