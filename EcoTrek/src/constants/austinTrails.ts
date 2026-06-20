// src/constants/austinTrails.ts
// Trail data is now fetched dynamically via Gemini in TrailsScreen.
// This file keeps the Trail type and a small static fallback.

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