import { api, isBackendConfigured, ROUTES } from '../services/api';
import { haversineMiles } from '../services/geo';
import {
  fetchOsmTrails,
  fetchPlace,
  inServiceBbox,
  isInServiceArea,
  isNearAustin,
  mergeTrailLists,
  readTrailCache,
  withDistances,
  writeTrailCache,
  type TrailCatalogue,
  type TrailSource,
} from '../services/nearbyTrails';

/**
 * Trail catalogue.
 *
 * 14 Austin-area trails ship inside the app so an Austin walker still sees
 * rich cards offline. Once we have a GPS fix, `fetchNearbyTrails` looks up
 * real named routes around the phone (OpenStreetMap) so a walker in New York
 * sees Central Park, not Lady Bird Lake. Service area is the US, Canada and
 * Mexico — anywhere else we return an empty list rather than Austin's.
 *
 * A language model is not the source of the list — models invent trails.
 * OSM reports trails that exist, with no API key and no backend required.
 */

export type Trail = {
  id: string;
  slug: string;
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
  elevationGainFt?: number;
  estimatedMinutes?: number;
  plants?: string[];
  animals?: string[];
  ecoPoints?: number;
  /** Trailhead coordinates — required for automatic trail detection. */
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  isLoop?: boolean;
  distanceFromUserMi?: number;
};

export const AUSTIN_TRAILS: Trail[] = [
  {
    id: 'lady-bird-lake',
    slug: 'lady-bird-lake-hike-and-bike',
    name: 'Ann and Roy Butler Hike-and-Bike Trail',
    type: 'mixed',
    distanceMiles: 10,
    difficulty: 'Easy',
    area: 'Downtown',
    description:
      'The 10-mile loop around Lady Bird Lake and the signature Austin trail. Crushed granite, flat, and busy at every hour.',
    safetyTips: [
      'Call your pass when overtaking — the trail is shared with runners.',
      'The boardwalk section has no shade; carry water in summer.',
      'Stay off the trail during and after heavy rain, sections flood.',
    ],
    rating: 4.8,
    petFriendly: true,
    familyFriendly: true,
    strollerFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 95,
    estimatedMinutes: 180,
    plants: ['Texas Live Oak', 'Bald Cypress', 'Pecan'],
    animals: ['Great Blue Heron', 'Red-eared Slider', 'Mexican Free-tailed Bat'],
    ecoPoints: 20,
    startLat: 30.2603,
    startLng: -97.75,
    isLoop: true,
  },
  {
    id: 'barton-creek',
    slug: 'barton-creek-greenbelt',
    name: 'Barton Creek Greenbelt',
    type: 'hike',
    distanceMiles: 7.9,
    difficulty: 'Moderate',
    area: 'South Austin',
    description:
      'Limestone canyon trail following Barton Creek, with swimming holes at Twin Falls and Sculpture Falls when the water is up.',
    safetyTips: [
      'Limestone is extremely slick when wet.',
      'Cell service drops inside the canyon — tell someone your route.',
      'Creek levels rise fast in storms. Never cross moving water.',
    ],
    rating: 4.7,
    petFriendly: true,
    familyFriendly: false,
    restroomsAvailable: false,
    waterStations: false,
    elevationGainFt: 420,
    estimatedMinutes: 210,
    plants: ['Ashe Juniper', 'Cedar Elm', 'Texas Persimmon'],
    animals: ['White-tailed Deer', 'Barred Owl', 'Green Anole'],
    ecoPoints: 25,
    startLat: 30.2447,
    startLng: -97.8003,
    endLat: 30.2607,
    endLng: -97.7727,
  },
  {
    id: 'walnut-creek',
    slug: 'walnut-creek-metro-park',
    name: 'Walnut Creek Metropolitan Park',
    type: 'mixed',
    distanceMiles: 15,
    difficulty: 'Moderate',
    area: 'North Austin',
    description:
      'Roughly 15 miles of singletrack and paved paths winding through oak woodland. The best beginner mountain biking in the city.',
    safetyTips: [
      'Singletrack is directional in places — follow posted arrows.',
      'Yield to uphill riders.',
      'Poison ivy grows right up to the trail edge.',
    ],
    rating: 4.6,
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 620,
    estimatedMinutes: 150,
    plants: ['Post Oak', 'Yaupon Holly', 'Little Bluestem'],
    animals: ['Fox Squirrel', 'Nine-banded Armadillo', 'Carolina Wren'],
    ecoPoints: 25,
    startLat: 30.3921,
    startLng: -97.689,
  },
  {
    id: 'mount-bonnell',
    slug: 'mount-bonnell',
    name: 'Mount Bonnell (Covert Park)',
    type: 'hike',
    distanceMiles: 0.6,
    difficulty: 'Moderate',
    area: 'West Austin',
    description:
      'A short, steep staircase to the highest overlook in central Austin, 775 feet above the Colorado River.',
    safetyTips: [
      'The 102 stone steps are uneven — hold the rail.',
      'Cliff edges at the top are unfenced.',
      'Parking on Mount Bonnell Road fills up by mid-morning on weekends.',
    ],
    rating: 4.7,
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: false,
    waterStations: false,
    elevationGainFt: 200,
    estimatedMinutes: 30,
    plants: ['Ashe Juniper', 'Texas Mountain Laurel', 'Prickly Pear'],
    animals: ['Black Vulture', 'Painted Bunting', 'Texas Spiny Lizard'],
    ecoPoints: 10,
    startLat: 30.321,
    startLng: -97.7734,
  },
  {
    id: 'mckinney-falls',
    slug: 'mckinney-falls-onion-creek',
    name: 'McKinney Falls — Onion Creek Trail',
    type: 'mixed',
    distanceMiles: 3.5,
    difficulty: 'Easy',
    area: 'Southeast Austin',
    description:
      'A paved loop through a state park past Upper and Lower Falls and a 500-year-old bald cypress known as Old Baldy.',
    safetyTips: [
      'State park entry fee applies.',
      'Do not enter the water when the falls are running high.',
      'The rock shelf above the falls is slippery year-round.',
    ],
    rating: 4.6,
    petFriendly: true,
    familyFriendly: true,
    strollerFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 130,
    estimatedMinutes: 75,
    plants: ['Bald Cypress', 'Sycamore', 'Buttonbush'],
    animals: ['Belted Kingfisher', 'Raccoon', 'Guadalupe Bass'],
    ecoPoints: 15,
    startLat: 30.183,
    startLng: -97.722,
    isLoop: true,
  },
  {
    id: 'turkey-creek',
    slug: 'turkey-creek-trail',
    name: 'Turkey Creek Trail',
    type: 'hike',
    distanceMiles: 2.7,
    difficulty: 'Moderate',
    area: 'Emma Long Park',
    description:
      'A shaded loop that crosses the creek a dozen times. Famously dog-friendly — most dogs run it off leash.',
    safetyTips: [
      'Twelve creek crossings; expect wet feet.',
      'Impassable after heavy rain.',
      'Park gate closes at sunset — do not get locked in.',
    ],
    rating: 4.7,
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: false,
    elevationGainFt: 275,
    estimatedMinutes: 80,
    plants: ['Sycamore', 'Ashe Juniper', 'Virginia Creeper'],
    animals: ['Wild Turkey', 'Golden-cheeked Warbler', 'Ringtail'],
    ecoPoints: 15,
    startLat: 30.3376,
    startLng: -97.846,
    isLoop: true,
  },
  {
    id: 'shoal-creek',
    slug: 'shoal-creek-trail',
    name: 'Shoal Creek Trail',
    type: 'mixed',
    distanceMiles: 4,
    difficulty: 'Easy',
    area: 'Central Austin',
    description:
      'Follows Shoal Creek from Lady Bird Lake north through Pease Park. A genuine car-free commuting route.',
    safetyTips: [
      'Several road crossings — stop and look.',
      'Sections wash out after storms and stay muddy for days.',
      'Poorly lit after dark.',
    ],
    rating: 4.3,
    petFriendly: true,
    familyFriendly: true,
    strollerFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 160,
    estimatedMinutes: 80,
    plants: ['Pecan', 'Cedar Elm', 'Inland Sea Oats'],
    animals: ['Eastern Screech Owl', 'Fox Squirrel', 'Cardinal'],
    ecoPoints: 12,
    startLat: 30.276,
    startLng: -97.753,
  },
  {
    id: 'bull-creek',
    slug: 'bull-creek-greenbelt',
    name: 'Bull Creek Greenbelt',
    type: 'hike',
    distanceMiles: 3.6,
    difficulty: 'Moderate',
    area: 'Northwest Austin',
    description:
      'Rocky creekside hiking with a waterfall and wide swimming holes. Quieter than Barton Creek on a weekend.',
    safetyTips: [
      'Water quality is posted at the trailhead — check before swimming.',
      'Loose rock on the descent to the creek.',
      'Flash flood zone; leave if it starts raining upstream.',
    ],
    rating: 4.5,
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: false,
    elevationGainFt: 240,
    estimatedMinutes: 95,
    plants: ['Bald Cypress', 'Ashe Juniper', 'Maidenhair Fern'],
    animals: ['Great Egret', 'Water Snake', 'Cliff Swallow'],
    ecoPoints: 15,
    startLat: 30.376,
    startLng: -97.786,
  },
  {
    id: 'southern-walnut',
    slug: 'southern-walnut-creek-trail',
    name: 'Southern Walnut Creek Trail',
    type: 'bike',
    distanceMiles: 7.3,
    difficulty: 'Easy',
    area: 'East Austin',
    description:
      'A wide, fully paved, mostly flat rail-trail from Govalle Park to Johnny Morris Road. The best long ride in Austin for beginners.',
    safetyTips: [
      'No shade for long stretches — start early in summer.',
      'A few blind curves under bridges.',
      'Trail is unlit; finish before dusk.',
    ],
    rating: 4.6,
    petFriendly: true,
    familyFriendly: true,
    strollerFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 210,
    estimatedMinutes: 60,
    plants: ['Cedar Elm', 'Mesquite', 'Switchgrass'],
    animals: ['Red-tailed Hawk', 'Cottontail Rabbit', 'Killdeer'],
    ecoPoints: 20,
    startLat: 30.285,
    startLng: -97.665,
  },
  {
    id: 'river-place',
    slug: 'river-place-nature-trail',
    name: 'River Place Nature Trail',
    type: 'hike',
    distanceMiles: 5.6,
    difficulty: 'Hard',
    area: 'Northwest Austin',
    description:
      'Roughly 2,000 stone steps down a canyon and back. Locals call it the Austin StairMaster for good reason.',
    safetyTips: [
      'Genuinely strenuous — turn back at the halfway bench if you are struggling.',
      'Carry two litres of water minimum; there is none on trail.',
      'Trail fee is card-only at the kiosk.',
    ],
    rating: 4.8,
    petFriendly: true,
    familyFriendly: false,
    restroomsAvailable: false,
    waterStations: false,
    elevationGainFt: 1100,
    estimatedMinutes: 180,
    plants: ['Ashe Juniper', 'Texas Madrone', 'Cedar Sage'],
    animals: ['Golden-cheeked Warbler', 'Grey Fox', 'Canyon Wren'],
    ecoPoints: 30,
    startLat: 30.383,
    startLng: -97.856,
  },
  {
    id: 'violet-crown',
    slug: 'violet-crown-trail',
    name: 'Violet Crown Trail',
    type: 'hike',
    distanceMiles: 12.9,
    difficulty: 'Moderate',
    area: 'South Austin',
    description:
      'Austin\u2019s first regional trail, running from Zilker south toward Hays County through the greenbelt corridor.',
    safetyTips: [
      'Long stretches between access points — plan your exit.',
      'Mile markers are your friend; screenshot the map before you start.',
      'Very exposed in the southern half.',
    ],
    rating: 4.5,
    petFriendly: true,
    familyFriendly: false,
    restroomsAvailable: false,
    waterStations: false,
    elevationGainFt: 760,
    estimatedMinutes: 330,
    plants: ['Ashe Juniper', 'Live Oak', 'Agarita'],
    animals: ['Coyote', 'Roadrunner', 'Texas Horned Lizard'],
    ecoPoints: 35,
    startLat: 30.2639,
    startLng: -97.7719,
  },
  {
    id: 'roy-guerrero',
    slug: 'roy-g-guerrero-park',
    name: 'Roy G. Guerrero Colorado River Park',
    type: 'mixed',
    distanceMiles: 4.5,
    difficulty: 'Easy',
    area: 'East Austin',
    description:
      'Riverside woods with a sandy beach, disc golf, and soft-surface trails under a huge pecan canopy.',
    safetyTips: [
      'Trails are unmarked — the river is always to your south.',
      'Muddy for a day or two after rain.',
      'Watch for disc golfers on the north side.',
    ],
    rating: 4.4,
    petFriendly: true,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 85,
    estimatedMinutes: 90,
    plants: ['Pecan', 'Cottonwood', 'Black Willow'],
    animals: ['Great Blue Heron', 'Beaver', 'Osprey'],
    ecoPoints: 15,
    startLat: 30.24,
    startLng: -97.715,
  },
  {
    id: 'slaughter-creek',
    slug: 'slaughter-creek-trail',
    name: 'Slaughter Creek Trail',
    type: 'bike',
    distanceMiles: 5.3,
    difficulty: 'Easy',
    area: 'Southwest Austin',
    description:
      'A flowy one-way singletrack loop through a nature preserve. Smooth, fast, and rarely crowded.',
    safetyTips: [
      'Strictly one-way — ride clockwise only.',
      'Closes when wet to protect the trail surface; check before you drive out.',
      'No shade on the back half.',
    ],
    rating: 4.5,
    petFriendly: false,
    familyFriendly: true,
    restroomsAvailable: true,
    waterStations: false,
    elevationGainFt: 190,
    estimatedMinutes: 55,
    plants: ['Live Oak', 'Blackfoot Daisy', 'Indian Blanket'],
    animals: ['Scissor-tailed Flycatcher', 'Jackrabbit', 'Bobwhite Quail'],
    ecoPoints: 18,
    startLat: 30.172,
    startLng: -97.888,
    isLoop: true,
  },
  {
    id: 'brushy-creek',
    slug: 'brushy-creek-regional-trail',
    name: 'Brushy Creek Regional Trail',
    type: 'mixed',
    distanceMiles: 6.75,
    difficulty: 'Easy',
    area: 'Round Rock',
    description:
      'Paved regional trail linking a chain of parks and lakes north of Austin. Wide, smooth and family-friendly.',
    safetyTips: [
      'Shared with a lot of stroller traffic on weekends.',
      'Several tunnel underpasses flood in storms.',
      'Sun exposure is high between parks.',
    ],
    rating: 4.6,
    petFriendly: true,
    familyFriendly: true,
    strollerFriendly: true,
    restroomsAvailable: true,
    waterStations: true,
    elevationGainFt: 300,
    estimatedMinutes: 100,
    plants: ['Live Oak', 'Bur Oak', 'Texas Sage'],
    animals: ['Great Egret', 'Turtle', 'Monarch Butterfly'],
    ecoPoints: 20,
    startLat: 30.51,
    startLng: -97.77,
  },
];

export type { TrailCatalogue, TrailSource };

/**
 * Returns trails around the user.
 *
 *   • No GPS yet                 → empty. Ask for location.
 *   • GPS outside US/CA/MX       → empty. EcoTrek does not cover that country.
 *   • GPS in Austin              → bundled list plus any extra OSM routes.
 *   • GPS elsewhere in US/CA/MX  → live OSM lookup for that city.
 *   • Backend configured         → nearby server rows merged in, never
 *                                  replacing a live local list with Austin seed.
 *
 * Never throws. A failed lookup falls back to cache, then to Austin only
 * if the phone is actually there.
 */
export async function fetchNearbyTrails(
  lat?: number,
  lon?: number
): Promise<TrailCatalogue> {
  if (lat == null || lon == null) {
    return { trails: [], region: null, source: 'need-location' };
  }

  const cached = readTrailCache(lat, lon);
  if (cached) return cached;

  const outsideBbox = !inServiceBbox(lat, lon);
  if (outsideBbox) {
    const place = await fetchPlace(lat, lon).catch(() => ({
      name: null,
      countryCode: null,
      country: null,
    }));
    const catalogue: TrailCatalogue = {
      trails: [],
      region: place.country ?? place.name ?? 'Outside the US, Canada, and Mexico',
      source: 'unsupported',
    };
    writeTrailCache(lat, lon, catalogue);
    return catalogue;
  }

  const nearAustin = isNearAustin(lat, lon);
  const [place, osmResult] = await Promise.all([
    fetchPlace(lat, lon).catch(() => ({ name: null, countryCode: null, country: null })),
    fetchOsmTrails(lat, lon, nearAustin ? 'Austin' : 'Nearby').catch((e) => {
      console.warn('[trails] OSM lookup failed', e);
      return [] as Trail[];
    }),
  ]);

  if (!isInServiceArea(lat, lon, place.countryCode)) {
    const catalogue: TrailCatalogue = {
      trails: [],
      region: place.country ?? place.name ?? 'Outside the US, Canada, and Mexico',
      source: 'unsupported',
    };
    writeTrailCache(lat, lon, catalogue);
    return catalogue;
  }

  const region = place.name ?? (nearAustin ? 'Austin, TX' : 'Nearby');
  const live = osmResult.map((t) => (t.area === 'Nearby' && region !== 'Nearby' ? { ...t, area: region } : t));

  let fromServer: Trail[] = [];
  if (isBackendConfigured()) {
    const res = await api.get<Trail[]>(`${ROUTES.trails}?lat=${lat}&lon=${lon}`);
    if (res.ok && Array.isArray(res.data)) {
      // Only keep server rows that are actually near the user. An old API
      // that ignores lat/lon would otherwise dump Austin onto a NYC phone.
      fromServer = res.data.filter((t) => {
        if (t.startLat == null || t.startLng == null) return false;
        return haversineMiles({ latitude: lat, longitude: lon }, { latitude: t.startLat, longitude: t.startLng }) <= 40;
      });
    }
  }

  let trails = mergeTrailLists(fromServer, live);

  if (nearAustin) {
    trails = mergeTrailLists(withDistances(AUSTIN_TRAILS, lat, lon), trails);
  }

  trails = withDistances(trails, lat, lon);

  if (trails.length === 0 && nearAustin) {
    trails = withDistances(AUSTIN_TRAILS, lat, lon);
  }

  const catalogue: TrailCatalogue = {
    trails,
    region,
    source: live.length || fromServer.length ? 'live' : nearAustin ? 'bundled' : 'live',
  };
  // Cache hits and unsupported-region answers. Do not cache an empty live
  // miss — Overpass blips should not hide a city for half an hour.
  if (trails.length || catalogue.source === 'bundled') writeTrailCache(lat, lon, catalogue);
  return catalogue;
}

export function getTrailById(id: string, catalogue: Trail[] = AUSTIN_TRAILS): Trail | undefined {
  return catalogue.find((t) => t.id === id || t.slug === id);
}
