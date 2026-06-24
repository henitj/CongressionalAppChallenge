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

// ─── Gemini Configuration ─────────────────────────────────────────────────────
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
// FIXED: Updated model name string to gemini-3.5-flash to eliminate 404 errors
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/` +
  `gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`;

/**
 * Fetches 8 trails near the user's coordinates automatically on screen mount.
 */
export async function fetchNearbyTrails(coord: Coord): Promise<Trail[]> {
  if (!GEMINI_KEY) {
    console.warn('Gemini API key missing! Using static fallback.');
    return AUSTIN_TRAILS;
  }

  const prompt = `
You are an expert Austin, TX trail guide. The user is currently at latitude ${coord.latitude}, longitude ${coord.longitude}.

Return a JSON array of exactly 8 real trails near this location in Austin, TX. Each trail object must contain these exact fields:
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

Sort by closest proximity to the user's coordinates.
`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.2,
          maxOutputTokens: 2500,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    return JSON.parse(rawText) as Trail[];
  } catch (error) {
    console.error('Error auto-loading trails from Gemini:', error);
    return AUSTIN_TRAILS;
  }
}