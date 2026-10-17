/**
 * Database-free social features.
 *
 * Challenges and hike plans travel INSIDE a short code/link — the recipient's
 * own copy of EcoTrek decodes it locally. Messages/WhatsApp/email carry the
 * code; no server ever stores anything.
 *
 * Safety model (these codes are untrusted input — anyone can type one):
 *   • Format is `v1.<base64url>.<checksum>`; a checksum rejects typos and
 *     casual tampering before we even parse JSON.
 *   • Decoded payloads are re-validated field by field: strings are stripped
 *     of control characters and length-capped, numbers must be finite and
 *     inside sane ranges, dates must be near-term. Anything else → null.
 *   • A challenge code can NEVER set its own reward. Completion pays a fixed
 *     FRIEND_CHALLENGE_POINTS, once, and only against the recipient's own
 *     recorded activity — a forged code cannot mint points or fake miles.
 *   • Total code length is capped so a megabyte paste can't stall the phone.
 */

export const FRIEND_CHALLENGE_POINTS = 15;
export const MAX_CODE_LENGTH = 2048;
const MAX_NAME = 40;
const MAX_TITLE = 60;
const MAX_NOTES = 140;

/* ---------------- base64url (pure JS, works in Hermes + web) ---------------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(text: string): number[] | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  const clean = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const idx = [0, 1, 2, 3].map((j) => B64.indexOf(padded[i + j]));
    if (idx.some((n) => n < 0 && padded[i + [0, 1, 2, 3][idx.indexOf(n)]] !== '=')) {
      // indexOf('=') is -1 too; only fail on genuinely unknown characters.
      if (idx.slice(0, 2).some((n) => n < 0)) return null;
    }
    const [a, b, c, d] = idx.map((n) => Math.max(0, n));
    bytes.push((a << 2) | (b >> 4));
    if (padded[i + 2] !== '=') bytes.push(((b & 15) << 4) | (c >> 2));
    if (padded[i + 3] !== '=') bytes.push(((c & 3) << 6) | d);
  }
  return bytes;
}

function utf8Encode(text: string): number[] {
  const encoded = encodeURIComponent(text);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(encoded.charCodeAt(i));
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string | null {
  try {
    return decodeURIComponent(bytes.map((b) => '%' + b.toString(16).padStart(2, '0')).join(''));
  } catch {
    return null;
  }
}

/** FNV-1a — a typo/tamper checksum, not a signature (no secret exists client-side). */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(-7);
}

export function encodePayload(payload: Record<string, unknown>): string {
  const body = bytesToBase64(utf8Encode(JSON.stringify(payload)));
  return `v1.${body}.${checksum(body)}`;
}

export function decodePayload(code: string): Record<string, unknown> | null {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > MAX_CODE_LENGTH) return null;
  // Accept a full link, a bare code, or a code pasted with surrounding text.
  const match = trimmed.match(/v1\.[A-Za-z0-9_-]+\.[a-z0-9]+/);
  if (!match) return null;
  const [, body, check] = match[0].split('.');
  if (!body || checksum(body) !== check) return null;
  const bytes = base64ToBytes(body);
  if (!bytes || bytes.length > 4096) return null;
  const json = utf8Decode(bytes);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ---------------- validation helpers ---------------- */

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function cleanTime(value: unknown, minMs: number, maxMs: number): number | null {
  const n = cleanNumber(value, 0, Number.MAX_SAFE_INTEGER);
  return n != null && n >= minMs && n <= maxMs ? Math.round(n) : null;
}

export function makeId(prefix: string, seed: number): string {
  return `${prefix}-${seed.toString(36)}-${checksum(`${prefix}:${seed}`).slice(0, 4)}`;
}

/* ---------------- hike plans ---------------- */

export type HikePlan = {
  id: string;
  trailId: string;
  trailName: string;
  area: string;
  startsAt: number;
  durationMin: number;
  notes: string;
  hostName: string;
  createdAt: number;
  /** true when this device created the plan. */
  mine: boolean;
  rsvp: 'in' | 'out' | null;
  /** Replies received back from friends via RSVP codes. */
  guests?: { name: string; status: 'in' | 'out' }[];
};

export function encodeHikePlan(plan: Omit<HikePlan, 'mine' | 'rsvp'>): string {
  return encodePayload({
    kind: 'plan',
    id: plan.id,
    trailId: plan.trailId,
    trailName: plan.trailName,
    area: plan.area,
    startsAt: plan.startsAt,
    durationMin: plan.durationMin,
    notes: plan.notes,
    hostName: plan.hostName,
    createdAt: plan.createdAt,
  });
}

export function decodeHikePlan(code: string, now = Date.now()): Omit<HikePlan, 'mine' | 'rsvp'> | null {
  const p = decodePayload(code);
  if (!p || p.kind !== 'plan') return null;
  const startsAt = cleanTime(p.startsAt, now - 7 * 86400000, now + 366 * 86400000);
  const createdAt = cleanTime(p.createdAt, now - 366 * 86400000, now + 86400000);
  const trailName = cleanText(p.trailName, MAX_TITLE);
  if (startsAt == null || createdAt == null || !trailName) return null;
  return {
    id: cleanText(p.id, 40) || makeId('plan', createdAt),
    trailId: cleanText(p.trailId, 60),
    trailName,
    area: cleanText(p.area, MAX_TITLE),
    startsAt,
    durationMin: cleanNumber(p.durationMin, 15, 720) ?? 120,
    notes: cleanText(p.notes, MAX_NOTES),
    hostName: cleanText(p.hostName, MAX_NAME) || 'A friend',
    createdAt,
  };
}

/* ---------------- friend challenges ---------------- */

export type ChallengeMetric = 'miles' | 'cleanup';

export type FriendChallenge = {
  id: string;
  title: string;
  metric: ChallengeMetric;
  /** Miles for metric='miles', pieces of litter for metric='cleanup'. */
  targetMiles: number;
  /** Unix ms deadline (end of that day is fine — comparisons use < deadline). */
  deadline: number;
  fromName: string;
  createdAt: number;
  mine: boolean;
  acceptedAt: number | null;
  completedAt: number | null;
  /** Filled when the OTHER person sends their result code back. */
  friendResult?: { name: string; amount: number; completed: boolean; at: number } | null;
};

export function encodeFriendChallenge(c: Omit<FriendChallenge, 'mine' | 'acceptedAt' | 'completedAt' | 'friendResult'>): string {
  return encodePayload({
    kind: 'challenge',
    id: c.id,
    title: c.title,
    metric: c.metric,
    targetMiles: c.targetMiles,
    deadline: c.deadline,
    fromName: c.fromName,
    createdAt: c.createdAt,
  });
}

export function decodeFriendChallenge(code: string, now = Date.now()): Omit<FriendChallenge, 'mine' | 'acceptedAt' | 'completedAt' | 'friendResult'> | null {
  const p = decodePayload(code);
  if (!p || p.kind !== 'challenge') return null;
  const metric: ChallengeMetric = p.metric === 'cleanup' ? 'cleanup' : 'miles';
  const targetMiles = cleanNumber(p.targetMiles, metric === 'cleanup' ? 1 : 0.5, metric === 'cleanup' ? 200 : 100);
  const deadline = cleanTime(p.deadline, now - 7 * 86400000, now + 366 * 86400000);
  const createdAt = cleanTime(p.createdAt, now - 366 * 86400000, now + 86400000);
  if (targetMiles == null || deadline == null || createdAt == null) return null;
  return {
    id: cleanText(p.id, 40) || makeId('challenge', createdAt),
    title: cleanText(p.title, MAX_TITLE) || (metric === 'cleanup' ? `Pick up ${targetMiles} pieces of litter` : `Walk ${targetMiles} miles`),
    metric,
    targetMiles,
    deadline,
    fromName: cleanText(p.fromName, MAX_NAME) || 'A friend',
    createdAt,
  };
}

/* --------- result & RSVP codes: how the loop gets closed --------- */

export type ChallengeResult = { challengeId: string; name: string; amount: number; completed: boolean; at: number };

export function encodeChallengeResult(r: ChallengeResult): string {
  return encodePayload({ kind: 'result', challengeId: r.challengeId, name: r.name, amount: r.amount, completed: r.completed, at: r.at });
}

export function decodeChallengeResult(code: string, now = Date.now()): ChallengeResult | null {
  const p = decodePayload(code);
  if (!p || p.kind !== 'result') return null;
  const amount = cleanNumber(p.amount, 0, 500);
  const at = cleanTime(p.at, now - 366 * 86400000, now + 86400000);
  const challengeId = cleanText(p.challengeId, 40);
  if (amount == null || at == null || !challengeId) return null;
  return { challengeId, name: cleanText(p.name, MAX_NAME) || 'A friend', amount, completed: p.completed === true, at };
}

export type RsvpReply = { planId: string; name: string; status: 'in' | 'out' };

export function encodeRsvp(r: RsvpReply): string {
  return encodePayload({ kind: 'rsvp', planId: r.planId, name: r.name, status: r.status });
}

export function decodeRsvp(code: string): RsvpReply | null {
  const p = decodePayload(code);
  if (!p || p.kind !== 'rsvp') return null;
  const planId = cleanText(p.planId, 40);
  if (!planId) return null;
  return { planId, name: cleanText(p.name, MAX_NAME) || 'A friend', status: p.status === 'out' ? 'out' : 'in' };
}

/* ---------------- pass the sapling ---------------- */

export type SaplingGift = { id: string; fromName: string; stageName: string; imageIndex: number; createdAt: number };

export function encodeSapling(g: SaplingGift): string {
  return encodePayload({ kind: 'sapling', id: g.id, fromName: g.fromName, stageName: g.stageName, imageIndex: g.imageIndex, createdAt: g.createdAt });
}

export function decodeSapling(code: string, now = Date.now()): SaplingGift | null {
  const p = decodePayload(code);
  if (!p || p.kind !== 'sapling') return null;
  const createdAt = cleanTime(p.createdAt, now - 366 * 86400000, now + 86400000);
  const imageIndex = cleanNumber(p.imageIndex, 0, 99);
  if (createdAt == null || imageIndex == null) return null;
  return {
    id: cleanText(p.id, 40) || makeId('sapling', createdAt),
    fromName: cleanText(p.fromName, MAX_NAME) || 'A friend',
    stageName: cleanText(p.stageName, MAX_TITLE) || 'Sapling',
    imageIndex: Math.round(imageIndex),
    createdAt,
  };
}

/** Pieces of litter picked up in [fromMs, toMs). */
export function cleanupPiecesInWindow(
  cleanups: { date: number; litterCount: number }[],
  fromMs: number,
  toMs: number
): number {
  let total = 0;
  for (const c of cleanups) {
    if (!Number.isFinite(c.litterCount) || c.litterCount <= 0) continue;
    if (c.date >= fromMs && c.date < toMs) total += Math.min(999, c.litterCount);
  }
  return Math.round(total);
}

/** Miles from valid activities started in [fromMs, toMs). */
export function milesInWindow(
  activities: { startedAt: number; miles: number; valid: boolean }[],
  fromMs: number,
  toMs: number
): number {
  let total = 0;
  for (const a of activities) {
    if (!a.valid || !Number.isFinite(a.miles) || a.miles <= 0) continue;
    if (a.startedAt >= fromMs && a.startedAt < toMs) total += a.miles;
  }
  return Math.round(total * 100) / 100;
}

/* ---------------- calendar (.ics) ---------------- */

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').slice(0, 300);
}

function icsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** A standard iCalendar event — opening it offers "Add to calendar" everywhere. */
export function buildIcsEvent(plan: Pick<HikePlan, 'id' | 'trailName' | 'area' | 'startsAt' | 'durationMin' | 'notes' | 'hostName'>): string {
  const end = plan.startsAt + plan.durationMin * 60000;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EcoTrek//Hike Plan//EN',
    'BEGIN:VEVENT',
    `UID:${icsEscape(plan.id)}@ecotrek.app`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(plan.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`Hike: ${plan.trailName}`)}`,
    `LOCATION:${icsEscape(plan.area || plan.trailName)}`,
    `DESCRIPTION:${icsEscape(`${plan.hostName} planned this hike with EcoTrek.${plan.notes ? ` ${plan.notes}` : ''}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Hike in one hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
