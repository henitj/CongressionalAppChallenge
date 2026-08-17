/**
 * Backend adapter.
 *
 * ── How this works ────────────────────────────────────────────────────────
 * EcoTrek is designed to run in two modes with the SAME code:
 *
 *   1. LOCAL MODE (default, no setup)   — every context falls back to
 *      AsyncStorage. The whole app works offline and on a fresh install with
 *      zero configuration. This is what runs today.
 *
 *   2. CLOUD MODE (set one env var)     — when EXPO_PUBLIC_API_URL points at
 *      your API in front of Neon Postgres, the same contexts read/write the
 *      server instead, and data syncs across devices.
 *
 * To switch modes you never touch this file or any screen. You add one line
 * to `.env`:
 *
 *      EXPO_PUBLIC_API_URL=https://your-api.vercel.app
 *
 * Requests never throw. They return { ok: false } and the caller silently
 * falls back to local data, so a backend outage can never crash the app.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export function isBackendConfigured(): boolean {
  return API_URL.length > 0;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

/** The auth token is injected by AuthContext so this module stays dependency-free. */
let tokenProvider: () => string | null = () => null;
export function setAuthTokenProvider(fn: () => string | null) {
  tokenProvider = fn;
}

const DEFAULT_TIMEOUT_MS = 12000;

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<ApiResult<T>> {
  if (!isBackendConfigured()) {
    return { ok: false, error: 'backend_not_configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const token = tokenProvider();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      return { ok: false, error: `http_${res.status}`, status: res.status };
    }

    // 204 No Content
    if (res.status === 204) return { ok: true, data: undefined as T };

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/**
 * Endpoint map — the exact routes your API must expose in cloud mode.
 * Documented here so the server and the client can never drift apart.
 * See db/README.md and server/README.md.
 */
export const ROUTES = {
  me: '/api/me',
  syncUser: '/api/me/sync',

  activities: '/api/activities',
  activity: (id: string) => `/api/activities/${id}`,

  points: '/api/points',

  streak: '/api/streak',
  streakCheckIn: '/api/streak/check-in',

  challenges: '/api/challenges',
  challengeComplete: (id: string) => `/api/challenges/${id}/complete`,

  clubs: '/api/clubs',
  club: (id: string) => `/api/clubs/${id}`,
  clubJoin: '/api/clubs/join',
  clubLeave: (id: string) => `/api/clubs/${id}/leave`,
  clubLock: (id: string) => `/api/clubs/${id}/lock`,
  clubContribute: (id: string) => `/api/clubs/${id}/contribute`,

  leaderboardClubs: '/api/leaderboard/clubs',
  leaderboardUsers: '/api/leaderboard/users',

  trails: '/api/trails',
  assistant: '/api/assistant',
  trailCompletions: '/api/trail-completions',

  devices: '/api/devices',
} as const;
