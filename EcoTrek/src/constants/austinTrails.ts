export type Trail = {
  id: string;
  name: string;
  type: 'hike' | 'bike' | 'mixed';
  distanceMiles: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  area: string;
  description: string;
  safetyTips: string[];
};

export const AUSTIN_TRAILS: Trail[] = [
  {
    id: 'butler',
    name: 'Ann & Roy Butler Hike-and-Bike Trail',
    type: 'mixed',
    distanceMiles: 10.1,
    difficulty: 'Easy',
    area: 'Lady Bird Lake',
    description:
      'Iconic loop around Lady Bird Lake — shaded, paved sections and crushed granite suitable for runners, walkers and bikers.',
    safetyTips: [
      'Stay right, pass on the left.',
      'Bring at least 1L of water — Texas heat is no joke.',
      'Watch for cyclists on shared boardwalk sections.',
    ],
  },
  {
    id: 'barton',
    name: 'Barton Creek Greenbelt',
    type: 'hike',
    distanceMiles: 7.9,
    difficulty: 'Moderate',
    area: 'South Austin',
    description:
      'Limestone cliffs, swimming holes, and a beautiful canopy along Barton Creek.',
    safetyTips: [
      'Trail can flood after rain — check water levels.',
      'Wear grippy shoes on limestone after rain.',
      'Cell signal can drop — share your route.',
    ],
  },
  {
    id: 'walnut',
    name: 'Walnut Creek Metropolitan Park',
    type: 'mixed',
    distanceMiles: 15.0,
    difficulty: 'Moderate',
    area: 'North Austin',
    description:
      'Network of singletrack mountain bike and hiking trails through Walnut Creek.',
    safetyTips: [
      'Yield to uphill traffic.',
      'Use a bell on blind corners.',
      'Avoid riding when trails are muddy.',
    ],
  },
  {
    id: 'mckinney',
    name: 'McKinney Falls State Park',
    type: 'hike',
    distanceMiles: 3.1,
    difficulty: 'Easy',
    area: 'Southeast Austin',
    description: 'Onion Creek hike with the iconic Upper and Lower Falls.',
    safetyTips: [
      'Falls are slippery — keep children close.',
      'Apply sunscreen — limited shade on rock shelves.',
      'Watch for snakes in tall grass.',
    ],
  },
  {
    id: 'veloway',
    name: 'Veloway',
    type: 'bike',
    distanceMiles: 3.1,
    difficulty: 'Easy',
    area: 'Southwest Austin',
    description:
      'Paved 3.1-mile loop reserved exclusively for cyclists and inline skaters.',
    safetyTips: [
      'Helmets strongly recommended.',
      'Single-direction loop — go with the flow.',
      'No pedestrians or pets allowed.',
    ],
  },
];
