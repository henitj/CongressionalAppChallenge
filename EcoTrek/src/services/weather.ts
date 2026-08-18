/**
 * Weather & outdoor-safety service.
 *
 * Two data sources, both free and **key-less** — nothing to configure, ever:
 *
 *   • Open-Meteo (https://open-meteo.com) — conditions, forecast, UV, air
 *     quality. No API key, no account, generous free tier.
 *   • NWS / weather.gov (https://api.weather.gov) — official US government
 *     watches, warnings and advisories (flood, tornado, winter storm, heat).
 *     No API key. This is the same feed that powers phone emergency alerts.
 *
 * The service turns raw numbers into a single verdict the UI can act on:
 * GOOD / CAUTION / WARNING / DANGER, plus a plain-English reason list.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const ALERTS_URL = 'https://api.weather.gov/alerts/active';

// weather.gov asks every client to identify itself.
const NWS_HEADERS = {
  'User-Agent': 'EcoTrek/1.0 (congressional-app-challenge; contact via app store listing)',
  Accept: 'application/geo+json',
};

export type SafetyLevel = 'good' | 'caution' | 'warning' | 'danger';

/**
 * The slice of an NWS alert we actually read. The real payload has around
 * thirty fields; typing only what we use documents the dependency and keeps
 * the parser honest if the feed changes shape.
 */
type NwsAlertFeature = {
  properties?: {
    id?: string;
    event?: string;
    severity?: string;
    headline?: string;
    description?: string;
    senderName?: string;
    ends?: string;
    expires?: string;
  };
};

export type Advisory = {
  id: string;
  level: SafetyLevel;
  icon: string;
  title: string;
  detail: string;
  /** Official NWS alerts get flagged so the UI can show the source. */
  official?: boolean;
  source?: string;
  expires?: string;
};

export type HourPoint = {
  time: string; // ISO local
  hour: number;
  temp: number;
  precipChance: number;
  code: number;
};

export type WeatherReport = {
  fetchedAt: number;
  lat: number;
  lon: number;
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windMph: number;
  windGustMph: number;
  precipInch: number;
  precipChance: number;
  uvIndex: number;
  aqi: number | null;
  isDay: boolean;
  code: number;
  condition: string;
  icon: string;
  highF: number;
  lowF: number;
  sunrise: string | null;
  sunset: string | null;
  hourly: HourPoint[];
  advisories: Advisory[];
  level: SafetyLevel;
  headline: string;
  summary: string;
  /** Suggested lower-risk window today, e.g. "7 AM – 9 AM". Null if none. */
  bestWindow: string | null;
  /** True when we served stale/cached data because the network failed. */
  stale: boolean;
};

/* ── WMO weather code → label + icon ──────────────────────────────────────── */

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'cloud-fog' },
  48: { label: 'Freezing fog', icon: 'cloud-fog' },
  51: { label: 'Light drizzle', icon: 'cloud-rain' },
  53: { label: 'Drizzle', icon: 'cloud-rain' },
  55: { label: 'Heavy drizzle', icon: 'cloud-rain' },
  56: { label: 'Freezing drizzle', icon: 'cloud-snow' },
  57: { label: 'Freezing drizzle', icon: 'cloud-snow' },
  61: { label: 'Light rain', icon: 'cloud-rain' },
  63: { label: 'Rain', icon: 'cloud-rain' },
  65: { label: 'Heavy rain', icon: 'cloud-rain' },
  66: { label: 'Freezing rain', icon: 'cloud-snow' },
  67: { label: 'Freezing rain', icon: 'cloud-snow' },
  71: { label: 'Light snow', icon: 'cloud-snow' },
  73: { label: 'Snow', icon: 'cloud-snow' },
  75: { label: 'Heavy snow', icon: 'cloud-snow' },
  77: { label: 'Snow grains', icon: 'cloud-snow' },
  80: { label: 'Rain showers', icon: 'cloud-rain' },
  81: { label: 'Rain showers', icon: 'cloud-rain' },
  82: { label: 'Violent rain showers', icon: 'cloud-rain' },
  85: { label: 'Snow showers', icon: 'cloud-snow' },
  86: { label: 'Heavy snow showers', icon: 'cloud-snow' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { label: 'Thunderstorm with hail', icon: 'cloud-lightning' },
  99: { label: 'Severe thunderstorm', icon: 'cloud-lightning' },
};

function describeCode(code: number, isDay: boolean) {
  const found = WMO[code] ?? { label: 'Unknown', icon: 'cloud' };
  if (found.icon === 'sun' && !isDay) return { ...found, icon: 'moon' };
  return found;
}

const LEVEL_RANK: Record<SafetyLevel, number> = {
  good: 0,
  caution: 1,
  warning: 2,
  danger: 3,
};

function worst(levels: SafetyLevel[]): SafetyLevel {
  return levels.reduce<SafetyLevel>(
    (acc, l) => (LEVEL_RANK[l] > LEVEL_RANK[acc] ? l : acc),
    'good'
  );
}

/* ── NWS alert classification ─────────────────────────────────────────────── */

/** Events that mean "do not go outside", regardless of stated severity. */
const DANGER_EVENTS = [
  'tornado',
  'flash flood',
  'flood warning',
  'hurricane',
  'tropical storm warning',
  'severe thunderstorm warning',
  'blizzard',
  'ice storm',
  'winter storm warning',
  'extreme heat warning',
  'excessive heat warning',
  'extreme cold warning',
  'wind chill warning',
  'red flag',
  'dust storm',
  'evacuation',
];

const WARNING_EVENTS = [
  'flood',
  'heat advisory',
  'wind advisory',
  'winter weather advisory',
  'freeze warning',
  'air quality',
  'dense fog',
  'high wind',
  'thunderstorm watch',
  'tornado watch',
  'small craft',
];

function classifyAlert(event: string, severity: string): SafetyLevel {
  const e = event.toLowerCase();
  if (DANGER_EVENTS.some((k) => e.includes(k))) return 'danger';
  if (severity === 'Extreme') return 'danger';
  if (severity === 'Severe') return 'danger';
  if (WARNING_EVENTS.some((k) => e.includes(k))) return 'warning';
  if (severity === 'Moderate') return 'warning';
  return 'caution';
}

/* ── Fetch helpers ────────────────────────────────────────────────────────── */

async function fetchJSON(url: string, headers?: Record<string, string>, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ── Cache (weather doesn't change every second; be a good API citizen) ────── */

let cache: { key: string; report: WeatherReport } | null = null;
const CACHE_MS = 10 * 60 * 1000;

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/* ── Main entry point ─────────────────────────────────────────────────────── */

export async function getWeatherReport(
  lat: number,
  lon: number,
  opts: { force?: boolean } = {}
): Promise<WeatherReport> {
  const key = cacheKey(lat, lon);
  if (!opts.force && cache && cache.key === key && Date.now() - cache.report.fetchedAt < CACHE_MS) {
    return cache.report;
  }

  const forecastUrl =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day' +
    '&hourly=temperature_2m,precipitation_probability,weather_code,apparent_temperature' +
    '&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=2';

  const airUrl = `${AIR_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
  const alertsUrl = `${ALERTS_URL}?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual&message_type=alert`;

  // Weather is required; air quality and alerts are best-effort extras.
  const [forecastRes, airRes, alertsRes] = await Promise.allSettled([
    fetchJSON(forecastUrl),
    fetchJSON(airUrl),
    fetchJSON(alertsUrl, NWS_HEADERS),
  ]);

  if (forecastRes.status !== 'fulfilled') {
    if (cache && cache.key === key) return { ...cache.report, stale: true };
    throw new Error('weather_unavailable');
  }

  const f = forecastRes.value;
  const cur = f.current ?? {};
  const daily = f.daily ?? {};
  const hourlyRaw = f.hourly ?? {};

  const aqi =
    airRes.status === 'fulfilled' && typeof airRes.value?.current?.us_aqi === 'number'
      ? Math.round(airRes.value.current.us_aqi)
      : null;

  const nwsFeatures: NwsAlertFeature[] =
    alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value?.features)
      ? alertsRes.value.features
      : [];

  const isDay = cur.is_day === 1 || cur.is_day === true;
  const code = Number(cur.weather_code ?? 0);
  const { label: condition, icon } = describeCode(code, isDay);

  const tempF = round1(cur.temperature_2m ?? 0);
  const feelsLikeF = round1(cur.apparent_temperature ?? tempF);
  const windMph = round1(cur.wind_speed_10m ?? 0);
  const windGustMph = round1(cur.wind_gusts_10m ?? windMph);
  const humidity = Math.round(cur.relative_humidity_2m ?? 0);
  const precipInch = round2(cur.precipitation ?? 0);
  const uvIndex = round1(daily.uv_index_max?.[0] ?? 0);
  const highF = round1(daily.temperature_2m_max?.[0] ?? tempF);
  const lowF = round1(daily.temperature_2m_min?.[0] ?? tempF);
  const precipChance = Math.round(daily.precipitation_probability_max?.[0] ?? 0);

  // ── Next 12 hours ──────────────────────────────────────────────────────
  const times: string[] = hourlyRaw.time ?? [];
  const nowIdx = Math.max(
    0,
    times.findIndex((t) => new Date(t).getTime() >= Date.now() - 30 * 60 * 1000)
  );
  const hourly: HourPoint[] = times.slice(nowIdx, nowIdx + 12).map((t, i) => {
    const idx = nowIdx + i;
    return {
      time: t,
      hour: new Date(t).getHours(),
      temp: round1(hourlyRaw.temperature_2m?.[idx] ?? 0),
      precipChance: Math.round(hourlyRaw.precipitation_probability?.[idx] ?? 0),
      code: Number(hourlyRaw.weather_code?.[idx] ?? 0),
    };
  });

  // ── Build advisories ───────────────────────────────────────────────────
  const advisories: Advisory[] = [];

  // 1. Official government alerts always come first.
  for (const feat of nwsFeatures) {
    const p = feat?.properties;
    if (!p?.event) continue;
    const level = classifyAlert(p.event, p.severity ?? 'Unknown');
    advisories.push({
      id: p.id ?? p.event,
      level,
      icon: alertIcon(p.event),
      title: p.event,
      detail: cleanText(p.headline ?? p.description ?? '') || 'Active alert for your area.',
      official: true,
      source: p.senderName ?? 'National Weather Service',
      expires: p.ends ?? p.expires ?? undefined,
    });
  }

  // 2. Thunderstorm / lightning
  if (code >= 95) {
    advisories.push({
      id: 'storm',
      level: 'danger',
      icon: 'cloud-lightning',
      title: 'Thunderstorms right now',
      detail:
        'Lightning is the danger, not the rain. Trails and creek crossings are unsafe — wait it out indoors.',
    });
  }

  // 3. Ice / freezing precipitation
  if ([56, 57, 66, 67].includes(code)) {
    advisories.push({
      id: 'ice',
      level: 'danger',
      icon: 'cloud-snow',
      title: 'Freezing rain',
      detail: 'Trails will be sheeted in ice. Falls and hypothermia are real risks — stay in today.',
    });
  }

  // 4. Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    const heavy = [75, 86].includes(code);
    advisories.push({
      id: 'snow',
      level: heavy ? 'danger' : 'warning',
      icon: 'cloud-snow',
      title: heavy ? 'Heavy snow' : 'Snow falling',
      detail: heavy
        ? 'Visibility and footing are both bad. Postpone your trek.'
        : 'Footing is slick and trail markers get buried. Shorten your route and tell someone where you are.',
    });
  }

  // 5. Rain
  if ([65, 82].includes(code)) {
    advisories.push({
      id: 'rain-heavy',
      level: 'warning',
      icon: 'cloud-rain',
      title: 'Heavy rain',
      detail:
        'Creek crossings rise fast and low-water areas flood. Never cross moving water you cannot see the bottom of.',
    });
  } else if ([61, 63, 80, 81, 51, 53, 55].includes(code)) {
    advisories.push({
      id: 'rain',
      level: 'caution',
      icon: 'cloud-rain',
      title: 'Rain in the area',
      detail: 'Rock and boardwalk sections get slippery. Bring a layer and watch your footing.',
    });
  }

  // 6. Heat — the #1 hazard in Central Texas
  if (feelsLikeF >= 105) {
    advisories.push({
      id: 'heat-extreme',
      level: 'danger',
      icon: 'thermometer',
      title: `Feels like ${Math.round(feelsLikeF)}°F`,
      detail:
        'Heat stroke range. Do not hike or ride now. Go early morning instead, or take today off.',
    });
  } else if (feelsLikeF >= 100) {
    advisories.push({
      id: 'heat-high',
      level: 'warning',
      icon: 'thermometer',
      title: `Feels like ${Math.round(feelsLikeF)}°F`,
      detail: 'Dangerous heat. Keep it short and shaded, carry more water than you think you need.',
    });
  } else if (feelsLikeF >= 93) {
    advisories.push({
      id: 'heat',
      level: 'caution',
      icon: 'thermometer',
      title: 'Hot out',
      detail: 'Carry at least one litre of water per hour and take shade breaks.',
    });
  }

  // 7. Cold
  if (feelsLikeF <= 15) {
    advisories.push({
      id: 'cold-extreme',
      level: 'danger',
      icon: 'thermometer',
      title: `Feels like ${Math.round(feelsLikeF)}°F`,
      detail: 'Frostbite risk on exposed skin within 30 minutes. Stay in.',
    });
  } else if (feelsLikeF <= 32) {
    advisories.push({
      id: 'cold',
      level: 'warning',
      icon: 'thermometer',
      title: 'Freezing conditions',
      detail: 'Layer up, cover extremities, and cut your route short if you stop sweating.',
    });
  }

  // 8. Wind
  if (windGustMph >= 35) {
    advisories.push({
      id: 'wind-high',
      level: 'warning',
      icon: 'wind',
      title: `Gusts to ${Math.round(windGustMph)} mph`,
      detail: 'Falling limbs are the risk. Avoid wooded trails and open bridges on a bike.',
    });
  } else if (windGustMph >= 22) {
    advisories.push({
      id: 'wind',
      level: 'caution',
      icon: 'wind',
      title: 'Windy',
      detail: 'Crosswinds can push a bike around. Ride defensively near traffic.',
    });
  }

  // 9. UV
  if (uvIndex >= 11) {
    advisories.push({
      id: 'uv-extreme',
      level: 'warning',
      icon: 'sun',
      title: `UV index ${Math.round(uvIndex)} — extreme`,
      detail: 'Unprotected skin burns in about 10 minutes. Hat, sunscreen, long sleeves.',
    });
  } else if (uvIndex >= 8) {
    advisories.push({
      id: 'uv',
      level: 'caution',
      icon: 'sun',
      title: `UV index ${Math.round(uvIndex)} — very high`,
      detail: 'Wear sunscreen and sunglasses, seek shade midday.',
    });
  }

  // 10. Air quality
  if (aqi !== null && aqi >= 151) {
    advisories.push({
      id: 'aqi-bad',
      level: 'warning',
      icon: 'cloud-fog',
      title: `Air quality unhealthy (AQI ${aqi})`,
      detail: 'Hard exercise pulls more of this into your lungs. Take it easy or move indoors.',
    });
  } else if (aqi !== null && aqi >= 101) {
    advisories.push({
      id: 'aqi',
      level: 'caution',
      icon: 'cloud-fog',
      title: `Air quality poor (AQI ${aqi})`,
      detail: 'If you have asthma, keep the effort light today.',
    });
  }

  // 11. Fog
  if ([45, 48].includes(code)) {
    advisories.push({
      id: 'fog',
      level: 'caution',
      icon: 'cloud-fog',
      title: 'Low visibility',
      detail: 'Drivers cannot see you. Wear something bright and use lights on a bike.',
    });
  }

  // 12. Darkness
  const sunsetTime = daily.sunset?.[0] ? new Date(daily.sunset[0]).getTime() : null;
  if (sunsetTime && Date.now() > sunsetTime - 45 * 60 * 1000 && Date.now() < sunsetTime + 6 * 3600000) {
    advisories.push({
      id: 'dark',
      level: 'caution',
      icon: 'moon',
      title: 'Losing daylight',
      detail: 'Most Austin trails are unlit. Bring a headlamp or pick a shorter loop.',
    });
  }

  advisories.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);

  const level = worst(advisories.map((a) => a.level));
  const { headline, summary } = buildVerdict(level, advisories, condition, tempF);

  const report: WeatherReport = {
    fetchedAt: Date.now(),
    lat,
    lon,
    tempF,
    feelsLikeF,
    humidity,
    windMph,
    windGustMph,
    precipInch,
    precipChance,
    uvIndex,
    aqi,
    isDay,
    code,
    condition,
    icon,
    highF,
    lowF,
    sunrise: daily.sunrise?.[0] ?? null,
    sunset: daily.sunset?.[0] ?? null,
    hourly,
    advisories,
    level,
    headline,
    summary,
    bestWindow: findBestWindow(hourlyRaw, nowIdx),
    stale: false,
  };

  cache = { key, report };
  return report;
}

/* ── Verdict copy ─────────────────────────────────────────────────────────── */

function buildVerdict(level: SafetyLevel, advisories: Advisory[], condition: string, temp: number) {
  const top = advisories[0];
  switch (level) {
    case 'danger':
      return {
        headline: 'Stay inside today',
        summary: top
          ? `${top.title}. ${top.detail}`
          : 'Weather is unsafe right now. Wait until it passes.',
      };
    case 'warning':
      return {
        headline: 'Be careful today',
        summary: top
          ? `${top.title}. ${top.detail}`
          : 'Weather is rough. Keep it short and stay alert.',
      };
    case 'caution':
      return {
        headline: 'A good day, with a few notes',
        summary: top ? `${top.title}. ${top.detail}` : 'A few small things to watch for.',
      };
    default:
      return {
        headline: 'Nice day to go outside',
        summary: `${condition}, ${Math.round(temp)}°F.`,
      };
  }
}

/** Finds a 2-hour window in the next 14 hours with the lowest heat + rain risk. */
function findBestWindow(hourlyRaw: any, startIdx: number): string | null {
  const times: string[] = hourlyRaw.time ?? [];
  const feels: number[] = hourlyRaw.apparent_temperature ?? hourlyRaw.temperature_2m ?? [];
  const rain: number[] = hourlyRaw.precipitation_probability ?? [];
  if (!times.length) return null;

  let best: { idx: number; score: number } | null = null;

  for (let i = startIdx; i < Math.min(startIdx + 14, times.length - 1); i++) {
    const hour = new Date(times[i]).getHours();
    if (hour < 6 || hour > 20) continue; // daylight only
    const heat = Math.abs((feels[i] ?? 75) - 68); // 68°F is the comfort target
    const wet = rain[i] ?? 0;
    const score = heat + wet * 0.8;
    if (!best || score < best.score) best = { idx: i, score };
  }

  if (!best) return null;
  const start = new Date(times[best.idx]);
  const end = new Date(start.getTime() + 2 * 3600000);
  // The search runs 14 hours ahead, which can land on tomorrow morning.
  // Saying "today" then would be wrong.
  const tomorrow = start.getDate() !== new Date().getDate();
  return `${fmtHour(start)} – ${fmtHour(end)}${tomorrow ? ' tomorrow' : ''}`;
}

function fmtHour(d: Date) {
  const h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

function alertIcon(event: string): string {
  const e = event.toLowerCase();
  if (e.includes('flood')) return 'water';
  if (e.includes('tornado') || e.includes('thunderstorm')) return 'cloud-lightning';
  if (e.includes('heat')) return 'thermometer';
  if (e.includes('winter') || e.includes('snow') || e.includes('ice') || e.includes('freeze'))
    return 'cloud-snow';
  if (e.includes('wind')) return 'wind';
  if (e.includes('fog')) return 'cloud-fog';
  if (e.includes('air quality') || e.includes('smoke')) return 'cloud-fog';
  if (e.includes('fire') || e.includes('red flag')) return 'flame';
  return 'alert-triangle';
}

function cleanText(s: string) {
  return s.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 240);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── UI helpers ───────────────────────────────────────────────────────────── */

export const LEVEL_META: Record<
  SafetyLevel,
  { label: string; tone: 'success' | 'info' | 'warning' | 'danger'; short: string }
> = {
  good: { label: 'Good to go', tone: 'success', short: 'GOOD' },
  caution: { label: 'Use caution', tone: 'info', short: 'CAUTION' },
  warning: { label: 'Poor conditions', tone: 'warning', short: 'WARNING' },
  danger: { label: 'Stay inside', tone: 'danger', short: 'DANGER' },
};
