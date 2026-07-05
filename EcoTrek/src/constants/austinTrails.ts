import { Coord } from '../services/location';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Trail = {
  id: string;
  name: string;
  type: 'hike' | 'bike' | 'mixed';
  distanceMiles: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  area: string;
  description: string;
  safetyTips: string[];
  imageUrl?: string;
  rating?: number;
  petFriendly?: boolean;
  familyFriendly?: boolean;
  strollerFriendly?: boolean;
  restroomsAvailable?: boolean;
  waterStations?: boolean;
  elevationGain?: string;
  estimatedTime?: string;
  plants?: string[];
  animals?: string[];
  ecoPoints?: number;
};

// ─── Static Fallback Data ─────────────────────────────────────────────────────
export const AUSTIN_TRAILS: Trail[] = [
  {
    id: '1',
    name: 'Lady Bird Lake Hike and Bike Trail',
    type: 'mixed',
    distanceMiles: 10,
    difficulty: 'Easy',
    area: 'Downtown Austin',
    description:
      'A scenic trail looping around Lady Bird Lake with beautiful city skyline views. Perfect for all skill levels.',
    safetyTips: [
      'Stay on designated paths to avoid wildlife.',
      'Be cautious of cyclists if walking or jogging.',
      'Carry water, especially during hot weather.',
    ],
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    rating: 4.8,
    plants: ['Texas Live Oak', 'Bald Cypress', 'Water Hyacinth'],
    animals: ['Great Blue Heron', 'Painted Bunting', 'River Otter'],
    ecoPoints: 25,
  },
];

// ─── Groq API Infrastructure Configuration ────────────────────────────────────
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.1-8b-instant';

// ─── Module-Level Safety Locks ────────────────────────────────────────────────
let activePromise: Promise<Trail[]> | null = null;
let lastFetchTimestamp = 0;
const THROTTLE_WINDOW_MS = 4000;

/**
 * Fetches 4 real trails near the user's coordinates using Groq LPU acceleration.
 * Fully satisfies the standard 'Coord' object signature containing a device timestamp.
 */
export async function fetchNearbyTrails(coord: Coord): Promise<Trail[]> {
  if (!GROQ_KEY) {
    console.warn('Groq API key missing! Using static fallback.');
    return AUSTIN_TRAILS;
  }

  // Deduplicate any race conditions from unexpected view cycles
  if (activePromise) {
    console.log('Intercepted running fetch thread. Re-routing stream...');
    return activePromise;
  }

  const now = Date.now();
  if (now - lastFetchTimestamp < THROTTLE_WINDOW_MS) {
    console.log('Throttled. Serving local cache data.');
    return AUSTIN_TRAILS;
  }

  lastFetchTimestamp = now;

  activePromise = (async () => {
    const prompt = `
You are an expert Austin, TX trail guide. The user is currently at latitude ${coord.latitude}, longitude ${coord.longitude}.

Return a valid JSON array of exactly 4 real trails near this location in Austin, TX. Each trail object must contain these exact fields:
{
  "id": "unique string",
  "name": "Trail Name",
  "type": "hike" | "bike" | "mixed",
  "distanceMiles": number,
  "difficulty": "Easy" | "Moderate" | "Hard",
  "area": "neighborhood or park name",
  "description": "2 sentence engaging description",
  "safetyTips": ["tip1", "tip2", "tip3"],
  "rating": number between 3.5 and 5.0,
  "petFriendly": boolean,
  "familyFriendly": boolean,
  "strollerFriendly": boolean,
  "restroomsAvailable": boolean,
  "waterStations": boolean,
  "elevationGain": "X ft",
  "estimatedTime": "X-Y hours",
  "plants": ["plant1", "plant2", "plant3"],
  "animals": ["animal1", "animal2"],
  "ecoPoints": number between 10 and 50
}

Sort by closest proximity to the user's coordinates. Do not write any introduction or explanation. Return ONLY the raw JSON array.
`;

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_completion_tokens: 1500,
          response_format: { type: 'json_object' } // Forces valid JSON generation
        }),
      });

      if (!res.ok) throw new Error(`Groq status error code: ${res.status}`);

      const data = await res.json();
      let rawText = data?.choices?.[0]?.message?.content ?? '[]';

      const jsonStartIndex = rawText.indexOf('[');
      const jsonEndIndex = rawText.lastIndexOf(']');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        rawText = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
      }

      return JSON.parse(rawText) as Trail[];
    } catch (error) {
      console.error('Error loading trails via Groq pipeline:', error);
      return AUSTIN_TRAILS;
    } finally {
      activePromise = null;
    }
  })();

  return activePromise;
}