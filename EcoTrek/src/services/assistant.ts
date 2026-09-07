import { Trail } from '../constants/austinTrails';
import { WeatherReport } from './weather';
import { haversineMiles } from './geo';

/**
 * Trail assistant.
 *
 * Answers plain-English questions about the trail catalogue. It resolves which
 * trail you mean from the question OR from what you were just talking about, so
 * "how long is the greenbelt?" followed by "are dogs allowed?" works the way a
 * conversation should.
 *
 * This runs entirely on-device against the trail data. No API key, no network,
 * no cost, and it cannot hallucinate a trail that does not exist — every answer
 * is read straight out of the catalogue.
 *
 * If a backend is configured, `askAssistant` in AssistantContext will try a real
 * language model first for open-ended questions and fall back to this. This is
 * the floor, not the ceiling.
 */

export type AssistantContext = {
  trails: Trail[];
  weather: WeatherReport | null;
  completedTrailIds: Set<string>;
  userCoords: { latitude: number; longitude: number } | null;
  /** Trail the conversation is currently about, for pronoun resolution. */
  focus: Trail | null;
  /** Miles or kilometres, matching the user's Settings choice. */
  units: 'imperial' | 'metric';
};

export type AssistantAnswer = {
  text: string;
  /** Trail this answer was about, so the UI can offer to open it. */
  trail: Trail | null;
  /** Trails to show as cards under the answer. */
  results: Trail[];
  /** Follow-up questions worth tapping. */
  suggestions: string[];
};


const ALIASES: Record<string, string[]> = {
  'lady-bird-lake': ['lady bird', 'ladybird', 'butler', 'town lake', 'the loop', 'boardwalk', 'downtown loop'],
  'barton-creek': ['greenbelt', 'barton', 'bc greenbelt', 'twin falls', 'sculpture falls', 'the belt'],
  'walnut-creek': ['walnut', 'metro park', 'walnut metro'],
  'mount-bonnell': ['bonnell', 'mt bonnell', 'covert park', 'the overlook', 'the stairs downtown'],
  'mckinney-falls': ['mckinney', 'onion creek', 'old baldy', 'state park'],
  'turkey-creek': ['turkey', 'emma long', 'dog trail'],
  'shoal-creek': ['shoal', 'pease park'],
  'bull-creek': ['bull', 'bull creek falls'],
  'southern-walnut': ['southern walnut', 'govalle', 'rail trail'],
  'river-place': ['river place', 'stairmaster', 'the stairs', 'austin stairmaster', '2000 steps'],
  'violet-crown': ['violet', 'crown trail'],
  'roy-guerrero': ['roy g', 'guerrero', 'secret beach', 'colorado river park'],
  'slaughter-creek': ['slaughter', 'slaughter loop'],
  'brushy-creek': ['brushy', 'round rock trail'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'can', 'do', 'does', 'i', 'me', 'my', 'to', 'at',
  'on', 'in', 'of', 'for', 'and', 'or', 'it', 'this', 'that', 'there', 'how',
  'what', 'where', 'which', 'was', 'be', 'you', 'we', 'trail', 'trails', 'go',
  'get', 'take', 'about', 'with', 'from', 'have', 'has', 'any', 'good', 'best',
]);

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}


export function resolveTrail(question: string, trails: Trail[]): Trail | null {
  const q = normalise(question);
  if (!q) return null;

  let best: { trail: Trail; score: number } | null = null;

  for (const trail of trails) {
    let score = 0;

    // Alias hit is the strongest signal — these are what people actually say.
    for (const alias of ALIASES[trail.id] ?? []) {
      if (q.includes(alias)) score = Math.max(score, 100 + alias.length);
    }

    // Whole name appearing verbatim.
    const name = normalise(trail.name);
    if (q.includes(name)) score = Math.max(score, 200);

    // Otherwise count meaningful shared words.
    const nameWords = name.split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const hits = nameWords.filter((w) => q.includes(w));
    if (hits.length) {
      score = Math.max(score, hits.reduce((s, w) => s + w.length, 0) * (hits.length > 1 ? 3 : 1));
    }

    if (score > 0 && (!best || score > best.score)) best = { trail, score };
  }

  // A single short word match is too weak to be sure about.
  return best && best.score >= 12 ? best.trail : null;
}

/** True when the question leans on something already said ("it", "there"). */
function isFollowUp(q: string): boolean {
  return /\b(it|its|it's|there|that one|this one|the same)\b/.test(q);
}


type Intent =
  | 'dogs' | 'water' | 'restrooms' | 'distance' | 'difficulty' | 'duration'
  | 'elevation' | 'family' | 'bike' | 'parking' | 'safety' | 'nature'
  | 'weather' | 'shade' | 'swim' | 'recommend' | 'nearest' | 'crowds'
  | 'overview' | 'list' | 'help';

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['dogs', /\b(dog|dogs|pet|pets|puppy|leash|canine)\b/],
  ['water', /\b(water|fountain|refill|hydrat|thirsty|drink)\b/],
  ['restrooms', /\b(restroom|bathroom|toilet|washroom|porta)\b/],
  ['swim', /\b(swim|swimming|dip|pool|falls|waterhole|water hole)\b/],
  ['duration', /\b(how long.*(take|takes)|how much time|duration|hours?\b)/],
  ['distance', /\b(how long|how far|distance|miles?|length|km)\b/],
  ['difficulty', /\b(hard|difficult|easy|tough|steep|beginner|challenging|strenuous)\b/],
  ['elevation', /\b(elevation|climb|hill|hills|incline|steps|stairs|vertical|gain)\b/],
  ['family', /\b(kid|kids|child|children|family|stroller|toddler|baby)\b/],
  ['bike', /\b(bike|biking|cycle|cycling|ride|riding|mtb|mountain bik)\b/],
  ['parking', /\b(park|parking|lot|drive|directions|address|where is)\b/],
  ['safety', /\b(safe|safety|danger|dangerous|risk|careful|warning|tips?)\b/],
  ['nature', /\b(animal|animals|wildlife|bird|birds|plant|plants|tree|trees|see|spot|nature)\b/],
  ['weather', /\b(weather|today|right now|should i go|conditions|hot|rain|raining|cold)\b/],
  ['shade', /\b(shade|shady|shaded|sun|sunny|exposed)\b/],
  ['crowds', /\b(crowd|crowded|busy|quiet|packed|people)\b/],
  ['nearest', /\b(near|nearest|close|closest|nearby|around me)\b/],
  ['recommend', /\b(recommend|suggest|should i|which trail|what trail|where should|best|good for|looking for)\b/],
  ['list', /\b(list|all trails|what trails|show me|options)\b/],
  ['help', /\b(help|what can you|how do you work)\b/],
];

function detectIntent(q: string): Intent {
  for (const [intent, re] of INTENT_PATTERNS) {
    if (re.test(q)) return intent;
  }
  return 'overview';
}


type Constraints = {
  dogs: boolean;
  family: boolean;
  stroller: boolean;
  bike: boolean;
  easy: boolean;
  hard: boolean;
  short: boolean;
  long: boolean;
  water: boolean;
  restrooms: boolean;
  shade: boolean;
  swim: boolean;
  near: boolean;
  newOnly: boolean;
  /** Explicit ceiling from "under 4 miles" and friends. */
  maxMiles: number | null;
  /** Explicit floor from "at least 5 miles". */
  minMiles: number | null;
};

function extractConstraints(q: string): Constraints {
  const under = q.match(/\b(?:under|less than|below|max|no more than|shorter than)\s+(\d+(?:\.\d+)?)\s*(?:mi|mile|miles|km)?\b/);
  const over = q.match(/\b(?:over|at least|more than|longer than|minimum)\s+(\d+(?:\.\d+)?)\s*(?:mi|mile|miles|km)?\b/);

  return {
    dogs: /\b(dog|dogs|pet|pets)\b/.test(q),
    family: /\b(kid|kids|child|children|family|stroller)\b/.test(q),
    stroller: /\bstroller\b/.test(q),
    maxMiles: under ? Number(under[1]) : null,
    minMiles: over ? Number(over[1]) : null,
    bike: /\b(bike|biking|cycle|cycling|ride|riding)\b/.test(q),
    easy: /\b(easy|beginner|flat|chill|relaxed|gentle|casual)\b/.test(q),
    hard: /\b(hard|tough|challenging|difficult|workout|steep|intense)\b/.test(q),
    short: /\b(short|quick|fast|30 min|half hour|little)\b/.test(q),
    long: /\b(long|far|all day|big|epic)\b/.test(q),
    water: /\b(water|fountain|refill)\b/.test(q),
    restrooms: /\b(restroom|bathroom|toilet)\b/.test(q),
    shade: /\b(shade|shady|shaded|cool)\b/.test(q),
    swim: /\b(swim|swimming|falls|dip)\b/.test(q),
    near: /\b(near|nearest|close|closest|nearby)\b/.test(q),
    newOnly: /\b(new|haven't|have not|never done|not done)\b/.test(q),
  };
}


/**
 * Formats a distance in the user's chosen units. The catalogue stores miles,
 * so metric users would otherwise be told a trail is "7.9 mi" while every
 * other screen said 12.7 km.
 */
function dist(miles: number, units: 'imperial' | 'metric' = 'imperial'): string {
  const value = units === 'metric' ? miles * 1.60934 : miles;
  const rounded = Number(value.toFixed(1));
  return `${rounded} ${units === 'metric' ? 'km' : 'mi'}`;
}

function duration(t: Trail): string {
  if (!t.estimatedMinutes) return 'no posted time';
  const h = Math.floor(t.estimatedMinutes / 60);
  const m = t.estimatedMinutes % 60;
  if (h === 0) return `about ${m} minutes`;
  if (m === 0) return `about ${h} hour${h === 1 ? '' : 's'}`;
  return `about ${h}h ${m}m`;
}

function yesNo(value: boolean | undefined, yes: string, no: string): string {
  return value ? yes : no;
}


export function answerQuestion(question: string, ctx: AssistantContext): AssistantAnswer {
  const q = normalise(question);
  const intent = detectIntent(q);
  const mi = (n: number) => dist(n, ctx.units);

  // Resolve the subject: named trail wins, otherwise carry the conversation.
  const named = resolveTrail(question, ctx.trails);
  const trail = named ?? (isFollowUp(q) || !named ? ctx.focus : null);

  const base = (text: string, suggestions: string[] = [], results: Trail[] = []) => ({
    text,
    trail,
    results,
    suggestions,
  });

  if (intent === 'help' || (!q && !trail)) {
    return base(
      'Ask me anything about the trails in this app. I know distances, difficulty, dogs, water, restrooms, elevation, what grows and lives there, and what the weather is doing right now.\n\nTry naming a trail, or just describe what you want — "somewhere easy I can bring the dog" works fine.',
      ['Which trail is best for beginners?', 'Where can I take my dog?', 'Is it safe to go out right now?']
    );
  }

  // Anything that needs a specific trail but has none → recommend instead.
  // Every intent below that dereferences `trail` must appear here. If the
  // question never named one and there is nothing in focus, we recommend
  // instead of guessing — that is what used to crash.
  const NEEDS_TRAIL: Intent[] = [
    'dogs', 'water', 'restrooms', 'distance', 'difficulty', 'duration',
    'elevation', 'parking', 'nature', 'shade', 'swim', 'crowds', 'family',
    'bike', 'safety',
  ];

  if (!trail && NEEDS_TRAIL.includes(intent)) {
    return recommend(question, ctx);
  }

  switch (intent) {
    case 'weather':
      return weatherAnswer(ctx, trail);

    case 'recommend':
    case 'nearest':
    case 'list':
      return recommend(question, ctx);

    case 'dogs':
      return base(
        trail!.petFriendly
          ? `Yes — dogs are welcome on the ${trail!.name}.${
              trail!.id === 'turkey-creek' ? ' It is the most dog-friendly trail in Austin; most people run it off leash.' : ''
            }${trail!.waterStations ? ' There is water on the trail, which helps in the heat.' : ' Bring water for them, there is none on the trail.'}`
          : `No — dogs are not allowed on the ${trail!.name}. ${dogAlternatives(ctx, trail!)}`,
        ['Is there water?', 'How long is it?', 'Is it shaded?']
      );

    case 'water':
      return base(
        `${yesNo(
          trail!.waterStations,
          `Yes, the ${trail!.name} has water stations`,
          `No, there is no drinking water on the ${trail!.name}`
        )}.${
          trail!.waterStations
            ? ' Still bring a bottle — in Austin summer you want a litre an hour.'
            : ' Carry everything you need. That is about one litre per hour in the heat.'
        }`,
        ['Are there restrooms?', 'How hot is it right now?']
      );

    case 'restrooms':
      return base(
        `${yesNo(
          trail!.restroomsAvailable,
          `Yes, there are restrooms at the ${trail!.name}`,
          `No restrooms at the ${trail!.name}`
        )}.${trail!.restroomsAvailable ? '' : ' Plan accordingly before you set off.'}`,
        ['Is there water?', 'Where do I park?']
      );

    case 'distance':
      return base(
        `The ${trail!.name} is ${mi(trail!.distanceMiles)}${
          trail!.isLoop ? ', as a loop' : ', point to point'
        }. That is ${duration(trail!)} at a normal pace.${
          trail!.isLoop ? '' : ' Double it if you are walking back to your car.'
        }`,
        ['How hard is it?', 'How much climbing?', 'Can I bike it?']
      );

    case 'duration':
      return base(
        `Plan ${duration(trail!)} for the ${trail!.name} — it is ${mi(trail!.distanceMiles)}${
          trail!.elevationGainFt ? ` with ${trail!.elevationGainFt} ft of climbing` : ''
        }. Add time if it is hot or you are stopping for photos.`,
        ['How hard is it?', 'Is it shaded?']
      );

    case 'difficulty':
      return base(
        `${trail!.name} is rated ${trail!.difficulty}.${
          trail!.elevationGainFt ? ` You climb about ${trail!.elevationGainFt} ft over ${mi(trail!.distanceMiles)}.` : ''
        } ${difficultyColour(trail!)}`,
        ['How long does it take?', 'Is it good for kids?']
      );

    case 'elevation':
      return base(
        trail!.elevationGainFt
          ? `${trail!.name} climbs about ${trail!.elevationGainFt} ft across ${mi(trail!.distanceMiles)}.${
              trail!.id === 'river-place'
                ? ' Almost all of it is stone steps — roughly 2,000 of them. People call it the Austin StairMaster for a reason.'
                : trail!.elevationGainFt > 500
                ? ' That is a real climb, not a stroll.'
                : trail!.elevationGainFt < 150
                ? ' Essentially flat.'
                : ' Rolling, nothing brutal.'
            }`
          : `No elevation figure recorded for the ${trail!.name}, but it is rated ${trail!.difficulty}.`,
        ['How long is it?', 'Is it good for kids?']
      );

    case 'family':
      return base(
        trail!.familyFriendly
          ? `Yes, the ${trail!.name} works well with kids.${
              trail!.strollerFriendly ? ' It is stroller-friendly too.' : ' It is not stroller-friendly though.'
            }${trail!.restroomsAvailable ? ' Restrooms on site.' : ' No restrooms, so plan ahead.'}`
          : `I would not call the ${trail!.name} family-friendly — it is rated ${trail!.difficulty}${
              trail!.elevationGainFt ? ` with ${trail!.elevationGainFt} ft of climbing` : ''
            }. ${familyAlternatives(ctx, trail!)}`,
        ['Are there restrooms?', 'Which trails are best for kids?']
      );

    case 'bike':
      return base(
        trail!.type === 'bike'
          ? `Yes — the ${trail!.name} is built for bikes. ${mi(trail!.distanceMiles)}, rated ${trail!.difficulty}.${
              trail!.id === 'slaughter-creek' ? ' It is one-way, ride clockwise only.' : ''
            }`
          : trail!.type === 'mixed'
          ? `Yes, the ${trail!.name} is shared use — bikes and walkers both. ${mi(
              trail!.distanceMiles
            )}. Call your pass when overtaking.`
          : `The ${trail!.name} is a hiking trail, not a bike route. ${bikeAlternatives(ctx)}`,
        ['How long is it?', 'Which trails are best for biking?']
      );

    case 'parking':
      return base(
        `The ${trail!.name} trailhead is in ${trail!.area}, at ${trail!.startLat.toFixed(
          4
        )}, ${trail!.startLng.toFixed(4)}. Open the trail from the Trails tab and tap "Open in maps" for directions.${
          trail!.id === 'mount-bonnell' ? ' Parking on Mount Bonnell Road fills up by mid-morning at weekends.' : ''
        }${trail!.id === 'mckinney-falls' ? ' It is a state park, so there is an entry fee.' : ''}`,
        ['How long is it?', 'Are there restrooms?']
      );

    case 'safety':
      return base(
        `Before you head out on the ${trail!.name}:\n\n${trail!.safetyTips
          .map((t) => `• ${t}`)
          .join('\n')}${weatherSuffix(ctx)}`,
        ['What is the weather doing?', 'Is there water?']
      );

    case 'nature':
      return base(
        `On the ${trail!.name} keep an eye out for:\n\n${
          trail!.plants?.length ? `Plants — ${trail!.plants.join(', ')}.\n` : ''
        }${trail!.animals?.length ? `Wildlife — ${trail!.animals.join(', ')}.` : ''}\n\nSpotting one of these knocks out a weekly challenge, by the way.`,
        ['Is it shaded?', 'How long is it?']
      );

    case 'shade':
      return base(shadeAnswer(trail!), ['How hot is it right now?', 'Is there water?']);

    case 'swim':
      return base(swimAnswer(trail!, ctx), ['Is it safe right now?', 'How do I get there?']);

    case 'crowds':
      return base(crowdAnswer(trail!), ['Is there parking?', 'What is the best time to go?']);

    case 'overview':
    default:
      if (!trail) return recommend(question, ctx);
      return base(
        `${trail.name} — ${trail.area}\n\n${trail.description}\n\n${mi(trail.distanceMiles)} · ${
          trail.difficulty
        } · ${duration(trail)}${trail.elevationGainFt ? ` · ${trail.elevationGainFt} ft climb` : ''}\n${[
          trail.petFriendly ? 'Dogs allowed' : 'No dogs',
          trail.restroomsAvailable ? 'Restrooms' : 'No restrooms',
          trail.waterStations ? 'Water available' : 'No water',
        ].join(' · ')}`,
        ['Is it good for kids?', 'How much climbing?', 'What can I see there?'],
        [trail]
      );
  }
}


function weatherAnswer(ctx: AssistantContext, trail: Trail | null): AssistantAnswer {
  const w = ctx.weather;
  if (!w) {
    return {
      text: 'I cannot reach the weather service right now. Check the Conditions screen in a moment.',
      trail,
      results: [],
      suggestions: ['Which trail is best for beginners?'],
    };
  }

  const verdict =
    w.level === 'danger'
      ? 'No — stay in.'
      : w.level === 'warning'
      ? 'I would not, honestly.'
      : w.level === 'caution'
      ? 'Yes, with a bit of care.'
      : 'Yes, conditions are good.';

  const advisories = w.advisories.slice(0, 2).map((a) => `• ${a.title}: ${a.detail}`).join('\n');

  return {
    text: `${verdict}\n\n${Math.round(w.tempF)}°F, feels like ${Math.round(w.feelsLikeF)}°F. ${
      w.condition
    }.${w.aqi != null ? ` Air quality index ${w.aqi}.` : ''}\n\n${
      advisories || 'No advisories in effect.'
    }${w.bestWindow ? `\n\nBest window today is ${w.bestWindow}.` : ''}${
      trail ? `\n\nThat applies to the ${trail.name} too.` : ''
    }`,
    trail,
    results: [],
    suggestions: ['Which trail has the most shade?', 'Where can I swim?'],
  };
}

/** A sentence of honest colour about what "Easy" or "Hard" actually means here. */
function difficultyColour(trail: Trail): string {
  if (trail.id === 'river-place') {
    return 'Do not underestimate it — around 2,000 stone steps. Turn back at the halfway bench if you are struggling.';
  }
  if (trail.difficulty === 'Easy') {
    return trail.strollerFriendly
      ? 'Flat and smooth enough for a stroller.'
      : 'Gentle going, fine for a first outing.';
  }
  if (trail.difficulty === 'Moderate') {
    return 'Uneven footing in places, but nothing technical.';
  }
  return 'This one is a genuine workout. Bring more water than you think you need.';
}

function shadeAnswer(trail: Trail): string {
  const shady = ['barton-creek', 'turkey-creek', 'bull-creek', 'walnut-creek', 'river-place', 'roy-guerrero'];
  const exposed = ['southern-walnut', 'slaughter-creek', 'brushy-creek', 'lady-bird-lake'];

  if (shady.includes(trail.id)) {
    return `${trail.name} is one of the shadier options — tree cover for most of it, which matters a lot in an Austin summer.`;
  }
  if (exposed.includes(trail.id)) {
    return `${trail.name} is fairly exposed with long stretches of no shade. Go early or late, and take more water than feels necessary.`;
  }
  return `${trail.name} is a mix of sun and shade. Bring a hat either way.`;
}

function swimAnswer(trail: Trail, ctx: AssistantContext): string {
  const swimmable: Record<string, string> = {
    'barton-creek': 'Twin Falls and Sculpture Falls both hold water when the creek is up. In a dry spell they can be down to puddles.',
    'bull-creek': 'Bull Creek has wide, shallow swimming holes and a small waterfall. Water quality is posted at the trailhead — check it.',
    'mckinney-falls': 'There is swimming below the falls, but not when the water is running high.',
  };

  if (swimmable[trail.id]) {
    const rain = ctx.weather?.precipChance ?? 0;
    return `${swimmable[trail.id]}${
      rain > 40 ? ' With rain in the forecast today, be careful — creek levels rise fast.' : ''
    }`;
  }
  return `No swimming on the ${trail.name}. For that, try the Barton Creek Greenbelt or Bull Creek.`;
}

function crowdAnswer(trail: Trail): string {
  const busy: Record<string, string> = {
    'lady-bird-lake': 'Busy at basically every hour. Before 7 AM on a weekday is the calmest it gets.',
    'barton-creek': 'Packed on warm weekends, especially near the Barton Springs entrance. Weekday mornings are quiet.',
    'mount-bonnell': 'Crowded at sunset, which is exactly when everyone wants to be there. Go at sunrise instead.',
  };
  return busy[trail.id] ?? `${trail.name} is usually one of the quieter options, especially on weekdays.`;
}

function weatherSuffix(ctx: AssistantContext): string {
  const w = ctx.weather;
  if (!w || w.level === 'good') return '';
  return `\n\nRight now: ${w.headline.toLowerCase()}. ${w.summary}`;
}

function dogAlternatives(ctx: AssistantContext, exclude: Trail): string {
  const options = ctx.trails.filter((t) => t.petFriendly && t.id !== exclude.id).slice(0, 2);
  return options.length ? `Try ${options.map((t) => t.name).join(' or ')} instead.` : '';
}

function familyAlternatives(ctx: AssistantContext, exclude: Trail): string {
  const options = ctx.trails.filter((t) => t.familyFriendly && t.id !== exclude.id).slice(0, 2);
  return options.length ? `${options.map((t) => t.name).join(' and ')} are much better with kids.` : '';
}

function bikeAlternatives(ctx: AssistantContext): string {
  const options = ctx.trails.filter((t) => t.type === 'bike' || t.type === 'mixed').slice(0, 2);
  return options.length ? `For riding, try ${options.map((t) => t.name).join(' or ')}.` : '';
}


function recommend(question: string, ctx: AssistantContext): AssistantAnswer {
  const q = normalise(question);
  const c = extractConstraints(q);
  const mi = (n: number) => dist(n, ctx.units);

  const scored = ctx.trails
    .map((t) => {
      let score = 0;
      const reasons: string[] = [];

      if (c.dogs) {
        if (!t.petFriendly) return null;
        score += 3;
        reasons.push('dogs allowed');
      }
      if (c.family) {
        if (!t.familyFriendly) return null;
        score += 3;
        reasons.push('good with kids');
      }
      if (c.stroller) {
        if (!t.strollerFriendly) return null;
        score += 2;
        reasons.push('stroller friendly');
      }
      if (c.maxMiles != null) {
        if (t.distanceMiles > c.maxMiles) return null;
        score += 2;
      }
      if (c.minMiles != null) {
        if (t.distanceMiles < c.minMiles) return null;
        score += 2;
      }
      if (c.bike) {
        if (t.type === 'hike') return null;
        score += 3;
        reasons.push('open to bikes');
      }
      if (c.swim && !['barton-creek', 'bull-creek', 'mckinney-falls'].includes(t.id)) return null;
      if (c.easy) {
        if (t.difficulty !== 'Easy') return null;
        score += 2;
        reasons.push('easy');
      }
      if (c.hard) {
        if (t.difficulty === 'Easy') return null;
        score += 2;
        reasons.push(t.difficulty.toLowerCase());
      }
      if (c.short) {
        if (t.distanceMiles > 4) return null;
        score += 2;
        reasons.push(mi(t.distanceMiles));
      }
      if (c.long) {
        if (t.distanceMiles < 6) return null;
        score += 2;
        reasons.push(mi(t.distanceMiles));
      }
      if (c.water) {
        if (!t.waterStations) return null;
        reasons.push('water on site');
      }
      if (c.restrooms) {
        if (!t.restroomsAvailable) return null;
        reasons.push('restrooms');
      }
      if (c.shade && ['barton-creek', 'turkey-creek', 'bull-creek', 'walnut-creek'].includes(t.id)) {
        score += 2;
        reasons.push('shaded');
      }
      if (c.newOnly && ctx.completedTrailIds.has(t.id)) return null;

      if (c.near && ctx.userCoords) {
        const d = haversineMiles(ctx.userCoords, { latitude: t.startLat, longitude: t.startLng });
        score += Math.max(0, 12 - d);
        reasons.push(`${d.toFixed(1)} mi away`);
      }

      score += (t.rating ?? 4) * 1.5;
      if (!ctx.completedTrailIds.has(t.id)) score += 1;

      return { trail: t, score, reasons };
    })
    .filter((x): x is { trail: Trail; score: number; reasons: string[] } => x !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      text: 'Nothing in the catalogue matches all of that. Try loosening one thing — drop the distance limit, or the dog requirement.',
      trail: null,
      results: [],
      suggestions: ['Which trail is best for beginners?', 'Where can I take my dog?'],
    };
  }

  const top = scored.slice(0, 3);
  const first = top[0];

  const heat = ctx.weather && ctx.weather.feelsLikeF >= 95
    ? `\n\nIt feels like ${Math.round(ctx.weather.feelsLikeF)}°F out there — ${
        ctx.weather.bestWindow ? `${ctx.weather.bestWindow} is your best window.` : 'go early or late.'
      }`
    : '';

  return {
    text: `${first.trail.name} is my pick — ${mi(first.trail.distanceMiles)}, ${first.trail.difficulty.toLowerCase()}${
      first.reasons.length ? `, ${first.reasons.slice(0, 3).join(', ')}` : ''
    }.\n\n${first.trail.description}${
      top.length > 1 ? `\n\nAlso worth a look: ${top.slice(1).map((t) => t.trail.name).join(', ')}.` : ''
    }${heat}`,
    trail: first.trail,
    results: top.map((t) => t.trail),
    suggestions: [
      `Is ${shortName(first.trail)} dog friendly?`,
      `How long does ${shortName(first.trail)} take?`,
      'What is the weather doing?',
    ],
  };
}

function shortName(t: Trail): string {
  return t.name.replace(/\s*(Trail|Greenbelt|Park|Metropolitan|Regional).*$/i, '').trim() || t.name;
}

/** Opening prompts shown before the user types anything. */
export const STARTER_QUESTIONS = [
  'Which trail is best for beginners?',
  'Where can I take my dog?',
  'Is it safe to go out right now?',
  'Somewhere shaded and under 4 miles',
  'Best trail for mountain biking?',
  'Where can I swim?',
];
