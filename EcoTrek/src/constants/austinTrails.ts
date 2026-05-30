import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();

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

/*
ToDO
Make function to 
Get location data, provide it to gemini and prompt engineer to have it identify trails, provide ID, Name
type, distance, difficulty, area, description, and tips 
every time this function is called create a new trail type in the AUSTIN_TRAILS
*/

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
  {
    id: 'bull-creek',
    name: 'Bull Creek District Park Trail',
    type: 'hike',
    distanceMiles: 2.7,
    difficulty: 'Moderate',
    area: 'Northwest Austin',
    description:
      'Scenic creek-side trail with natural swimming holes, limestone ledges, and shaded woodland paths popular with families and dogs.',
    safetyTips: [
      'Swimming areas have no lifeguard — supervise children at all times.',
      'Leash your dog near the water.',
      'Rocky creek crossings can be slippery — tread carefully.',
    ],
  },
  {
    id: 'balcones',
    name: 'Balcones Canyonlands Preserve — Doeskin Ranch',
    type: 'hike',
    distanceMiles: 5.5,
    difficulty: 'Moderate',
    area: 'Lago Vista / Northwest Austin',
    description:
      'Rolling Hill Country terrain with cedar and oak woodland, excellent birding for Golden-cheeked Warblers, and sweeping canyon views.',
    safetyTips: [
      'Bring a trail map — intersections are not always well marked.',
      'Rattlesnakes are present in rocky areas.',
      'Limited shade — start early in summer months.',
    ],
  },
  {
    id: 'emma-long',
    name: 'Emma Long Metropolitan Park Trails',
    type: 'mixed',
    distanceMiles: 8.2,
    difficulty: 'Hard',
    area: 'West Austin',
    description:
      'Rugged dirt trails winding through dense cedar and oak on the shores of Lake Austin, popular with mountain bikers and hikers seeking a challenge.',
    safetyTips: [
      'Trails are technical — beginners should scout before committing.',
      'Carry extra water; no water stations on trail.',
      'Ticks are common — do a full body check after your hike.',
    ],
  },
  {
    id: 'shoal-creek',
    name: 'Shoal Creek Trail',
    type: 'mixed',
    distanceMiles: 4.3,
    difficulty: 'Easy',
    area: 'Central Austin',
    description:
      'Paved urban greenway following Shoal Creek from Lady Bird Lake northward through several neighborhoods, perfect for a quick city escape.',
    safetyTips: [
      'Trail crosses several busy roads — use crosswalks.',
      'Flooding is possible after heavy rain.',
      'Stay alert for other trail users in narrow sections.',
    ],
  },
  {
    id: 'sculpture-falls',
    name: 'Sculpture Falls Trail',
    type: 'hike',
    distanceMiles: 2.4,
    difficulty: 'Moderate',
    area: 'South Austin / Barton Creek',
    description:
      'Short but rewarding hike through the Barton Creek Greenbelt leading to the beloved Sculpture Falls swimming hole.',
    safetyTips: [
      'Flash flooding risk — never hike here if storms are in the forecast.',
      'The falls area gets crowded on weekends — arrive early.',
      'Wear water shoes for creek crossings.',
    ],
  },
  {
    id: 'colorado-river',
    name: 'Colorado River Refuge Trail',
    type: 'hike',
    distanceMiles: 6.0,
    difficulty: 'Easy',
    area: 'Bastrop / East Austin',
    description:
      'Peaceful flatland trail along the Colorado River corridor through loblolly pine forest with excellent wildlife viewing opportunities.',
    safetyTips: [
      'Mosquitoes can be heavy — bring repellent.',
      'Stay on marked trails to protect sensitive habitat.',
      'Cell coverage is spotty — download an offline map.',
    ],
  },
  {
    id: 'slaughter-creek',
    name: 'Slaughter Creek Metropolitan Park Trail',
    type: 'mixed',
    distanceMiles: 5.0,
    difficulty: 'Easy',
    area: 'Southwest Austin',
    description:
      'Flat, family-friendly network of natural-surface trails and open meadows along Slaughter Creek, great for trail running and dog walking.',
    safetyTips: [
      'Dogs must be on leash at all times.',
      'Paths can be muddy after rain — check conditions first.',
      'Limited parking on weekends — arrive early.',
    ],
  },
  {
    id: 'onion-creek',
    name: 'Onion Creek Hike & Bike Trail',
    type: 'mixed',
    distanceMiles: 4.8,
    difficulty: 'Easy',
    area: 'Southeast Austin',
    description:
      'Paved and natural-surface trail running along Onion Creek through Mary Moore Searight Metropolitan Park, ideal for casual rides and walks.',
    safetyTips: [
      'Stay on paved sections during or after heavy rain.',
      'Watch for wildlife — deer and armadillos are common.',
      'Trail is exposed mid-day — bring sun protection.',
    ],
  },
  {
    id: 'lake-travis',
    name: 'Lake Travis Trail at Arkansas Bend Park',
    type: 'hike',
    distanceMiles: 3.8,
    difficulty: 'Moderate',
    area: 'Lago Vista / Lake Travis',
    description:
      'Rugged lakeside trail offering dramatic Hill Country views of Lake Travis, cedar-filled ravines, and secluded coves for swimming.',
    safetyTips: [
      'No lifeguard on duty at swimming coves.',
      'Trail edges can be unstable near cliff drop-offs.',
      'Bring more water than you think you need in summer.',
    ],
  },
  {
    id: 'barton-springs',
    name: 'Barton Springs Nature Trail',
    type: 'hike',
    distanceMiles: 1.5,
    difficulty: 'Easy',
    area: 'Zilker Park',
    description:
      'Short interpretive loop around Barton Springs Pool through native plantings, great for families learning about Austin\'s natural springs ecosystem.',
    safetyTips: [
      'Stay on the path to protect native plants.',
      'Grounds close at dusk — plan accordingly.',
      'The pool itself requires a separate admission fee.',
    ],
  },
  {
    id: 'wild-basin',
    name: 'Wild Basin Wilderness Preserve',
    type: 'hike',
    distanceMiles: 2.6,
    difficulty: 'Moderate',
    area: 'West Austin',
    description:
      'Protected 227-acre preserve with wooded canyon trails, a seasonal waterfall, and excellent bird-watching managed by St. Edward\'s University.',
    safetyTips: [
      'Reserve your entry online — capacity is limited.',
      'No pets allowed in the preserve.',
      'Wear closed-toe shoes; poison ivy is present along trail edges.',
    ],
  },
  {
    id: 'harris-branch',
    name: 'Harris Branch Trail',
    type: 'mixed',
    distanceMiles: 6.5,
    difficulty: 'Easy',
    area: 'Northeast Austin',
    description:
      'Wide paved greenway cutting through Northeast Austin neighborhoods, connecting parks and open spaces — a great commuter and recreational path.',
    safetyTips: [
      'Multiple road crossings — watch for traffic.',
      'Limited shade — morning rides are much cooler.',
      'Carry a spare tube; sections are far from bike shops.',
    ],
  },
  {
    id: 'brushy-creek',
    name: 'Brushy Creek Regional Trail',
    type: 'mixed',
    distanceMiles: 15.2,
    difficulty: 'Easy',
    area: 'Round Rock / Cedar Park',
    description:
      'One of the longest continuous trails in the Austin metro area, winding through creek corridors, neighborhood parks, and open fields north of the city.',
    safetyTips: [
      'The trail is long — know your turnaround point before you start.',
      'Creek crossings may be underwater after heavy rain.',
      'Bring a fully charged phone — the trail is very long.',
    ],
  },
  {
    id: 'cedar-ridge',
    name: 'Cedar Ridge Preserve',
    type: 'hike',
    distanceMiles: 8.0,
    difficulty: 'Moderate',
    area: 'Southwest Austin / Dallas — local chapter',
    description:
      'Audubon Society preserve with six interconnected hiking trails through Hill Country cedar woodland, excellent for birding and wildflower viewing in spring.',
    safetyTips: [
      'Open Wednesday–Sunday only — check hours before visiting.',
      'No dogs allowed to protect wildlife.',
      'Bring binoculars — over 200 bird species recorded here.',
    ],
  },
  {
    id: 'lake-walter-long',
    name: 'Walter E. Long Metropolitan Park Trail',
    type: 'mixed',
    distanceMiles: 4.0,
    difficulty: 'Easy',
    area: 'East Austin',
    description:
      'Quiet lakeside trail along the shores of Lake Walter E. Long — a hidden gem in East Austin with fishing spots, open meadows, and great sunrise views.',
    safetyTips: [
      'Gate hours are limited — check the park schedule.',
      'No swimming in the lake.',
      'Bring bug spray near the shoreline in warm months.',
    ],
  },
];