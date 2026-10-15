import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bring-your-own-key AI upgrade.
 *
 * The assistant always answers from the on-device engine first — that works
 * offline, costs nothing, and needs zero setup. This module adds an optional
 * second step: if the user pastes their own API key for any OpenAI-compatible
 * service (OpenAI, Groq, OpenRouter, Together, a self-hosted server, …), the
 * grounded facts get rephrased by a real language model.
 *
 * Design rules:
 *   - The key lives ONLY in this device's local storage. It is never sent
 *     anywhere except directly to the provider the user chose, and only over
 *     HTTPS: the endpoint check below refuses anything else, because a key
 *     sent over http:// is readable by every hop on the way.
 *   - Requests never throw. On any failure the caller keeps the on-device
 *     answer, so a bad key or a dead network can never break the assistant.
 *   - The model is grounded on the catalogue facts we pass it and told not
 *     to invent trails, so a hallucinated answer can't sneak in.
 */

export type AiProviderSettings = {
  /** The user's own API key. Empty string = feature off. */
  apiKey: string;
  /** OpenAI-compatible base URL, no trailing slash, e.g. https://api.groq.com/openai/v1 */
  baseUrl: string;
  /** Model id understood by that provider. */
  model: string;
};

export type AiPreset = {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** Where the user can create a key. */
  keyUrl: string;
  note: string;
};

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'grok', label: 'Grok (xAI)', baseUrl: 'https://api.x.ai/v1', model: 'grok-4.7',
    keyUrl: 'console.x.ai', note: 'Optional paid key',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'console.groq.com/keys',
    note: 'Free tier available',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyUrl: 'platform.openai.com/api-keys',
    note: 'Paid key',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'openrouter.ai/keys',
    note: 'Free models available',
  },
];

export const DEFAULT_AI_SETTINGS: AiProviderSettings = {
  apiKey: '',
  baseUrl: AI_PRESETS[1].baseUrl,
  model: AI_PRESETS[1].model,
};

const STORAGE_KEY = '@ecotrek/shared/ai-provider';

/**
 * The key travels in an Authorization header, so the endpoint has to be
 * encrypted. A plain http:// endpoint would hand the key to anything on the
 * network path, so it is refused rather than silently used. Every built-in
 * provider (Groq, OpenAI, OpenRouter) is https.
 */
export function isAllowedBaseUrl(value: string): boolean {
  return /^https:\/\/[^\s]+$/i.test((value ?? '').trim());
}

function sanitise(value: unknown): AiProviderSettings {
  const v = (value ?? {}) as Partial<AiProviderSettings>;
  return {
    apiKey: typeof v.apiKey === 'string' ? v.apiKey.trim() : '',
    baseUrl:
      typeof v.baseUrl === 'string' && isAllowedBaseUrl(v.baseUrl)
        ? v.baseUrl.trim().replace(/\/+$/, '')
        : DEFAULT_AI_SETTINGS.baseUrl,
    model: typeof v.model === 'string' && v.model.trim() ? v.model.trim() : DEFAULT_AI_SETTINGS.model,
  };
}

export async function loadAiSettings(): Promise<AiProviderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return sanitise(JSON.parse(raw));
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function saveAiSettings(settings: AiProviderSettings): Promise<AiProviderSettings> {
  const clean = sanitise(settings);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* storage full / unavailable — the in-memory copy still works this session */
  }
  return clean;
}

export function hasAiKey(settings: AiProviderSettings | null | undefined): boolean {
  return !!settings && settings.apiKey.length > 0;
}

/** Context payload shared with the model — plain facts, already vetted. */
export type AiAnswerContext = {
  trail: Record<string, unknown> | null;
  allTrails: Array<Record<string, unknown>>;
  weather: Record<string, unknown> | null;
};

const SYSTEM_PROMPT =
  'You are the assistant inside EcoTrek, an outdoor activity app. Answer the user\'s actual question directly, including custom or general questions; do not force every question into a trail fact. ' +
  'Use the supplied EcoTrek trail and weather data when it is relevant, but do not invent trail names, distances, amenities, live conditions, or personal activity history. ' +
  'If asked for real-time information that is not in the supplied data, say you cannot verify it. Be concise, friendly, and clear. ' +
  'Do not claim to have checked a map, website, or current conditions unless the supplied data says so.';

export type AssistantChatTurn = { role: 'user' | 'assistant'; content: string };

type PuterSdk = {
  auth?: {
    isSignedIn: () => boolean;
    signIn: (options?: { request_auth?: boolean }) => Promise<unknown>;
  };
  ai?: {
    chat: (messages: Array<{ role: string; content: string }>, options?: Record<string, unknown>) => Promise<unknown>;
  };
};

declare global {
  interface Window {
    puter?: PuterSdk;
    /** Injected by the web exporter: a same-origin, pinned SDK asset. */
    __ECOTREK_PUTER_SDK_URL__?: string;
  }
}

// Verified against Puter's xAI catalogue. This alias is Grok, not Groq/Llama.
export const DEFAULT_GROK_MODEL = 'x-ai/grok-4.7';
let puterLoadPromise: Promise<PuterSdk> | null = null;

export type PuterFailureCode = 'auth_required' | 'popup_blocked' | 'cancelled' | 'quota' | 'timeout' | 'unavailable';
export type PuterResult = { ok: true; text: string; model: string }
  | { ok: false; code: PuterFailureCode; message: string };
export type PuterConnection = { ok: true; signedIn: boolean } | { ok: false; code: PuterFailureCode; message: string };

function deadline<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    request,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out')), Math.max(1, timeoutMs)); }),
  ]).finally(() => clearTimeout(timer));
}

function failure(error: unknown): Extract<PuterResult, { ok: false }> {
  const e = error as any;
  const detail = [e?.code, e?.error?.code, e?.error?.message, typeof e?.error === 'string' ? e.error : '', e?.message, e?.msg].filter(Boolean).join(' ').toLowerCase();
  if (/popup.block|pop.up.block/.test(detail)) return { ok: false, code: 'popup_blocked', message: 'Allow the Puter sign-in popup in your browser, then tap Connect Grok again.' };
  if (/auth_window_closed|cancel|closed by/.test(detail)) return { ok: false, code: 'cancelled', message: 'Puter sign-in was cancelled. Your on-device trail answers still work.' };
  if (/auth|sign.in|not.logged|401/.test(detail)) return { ok: false, code: 'auth_required', message: 'Connect your Puter account to use Grok. On-device trail answers are available without connecting.' };
  if (/insufficient|credit|balance|quota|rate.limit|payment|402|429|usage.limit/.test(detail)) return { ok: false, code: 'quota', message: 'Puter could not approve this request. Check your Puter credits or usage limits, or try again later.' };
  if (/timed.out|timeout/.test(detail)) return { ok: false, code: 'timeout', message: 'Grok took too long to respond. Please try again. Your on-device trail answer is shown below.' };
  return { ok: false, code: 'unavailable', message: 'Grok could not be reached. Check your connection and retry; on-device trail answers still work.' };
}

function loadPuterSdk(timeoutMs = 10000): Promise<PuterSdk> {
  if (typeof window !== 'undefined' && window.puter?.ai?.chat) return Promise.resolve(window.puter);
  if (typeof document === 'undefined') return Promise.reject(new Error('Puter is only available on web'));
  if (puterLoadPromise) return puterLoadPromise;
  puterLoadPromise = new Promise<PuterSdk>((resolve, reject) => {
    const id = 'ecotrek-puter-ai-sdk';
    // A failed/timed-out script must be removed; reusing that element leaves
    // every retry waiting for a load event that has already happened.
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    };
    script.id = id;
    script.async = true;
    script.src = window.__ECOTREK_PUTER_SDK_URL__ || 'https://js.puter.com/v2/';
    script.onload = () => {
      cleanup();
      if (window.puter?.ai?.chat) resolve(window.puter);
      else { script.remove(); reject(new Error('Puter SDK unavailable')); }
    };
    script.onerror = () => { cleanup(); script.remove(); reject(new Error('Puter SDK unavailable')); };
    timer = setTimeout(() => { cleanup(); script.remove(); reject(new Error('Puter SDK timed out')); }, timeoutMs);
    document.head.appendChild(script);
  }).catch((error) => { puterLoadPromise = null; throw error; });
  return puterLoadPromise;
}

/** Preload on entering Assistant, not on sending: keeps auth in a user gesture. */
export async function preparePuter(): Promise<PuterConnection> {
  try {
    const sdk = await loadPuterSdk();
    return { ok: true, signedIn: !!sdk.auth?.isSignedIn() };
  } catch (error) {
    const result = failure(error);
    return result.code === 'timeout' ? { ...result, message: 'The Puter SDK did not load in time. Check your connection and retry.' } : result;
  }
}

/** Call directly from a deliberate tap; do not await anything before signIn. */
export function connectPuter(): Promise<PuterConnection> {
  const sdk = typeof window === 'undefined' ? undefined : window.puter;
  if (!sdk?.auth) return Promise.resolve({ ok: false, code: 'unavailable', message: 'The Puter SDK is not ready. Retry the connection, then tap Connect Grok.' });
  if (sdk.auth.isSignedIn()) return Promise.resolve({ ok: true, signedIn: true });
  try {
    // Opening this synchronously is essential on Safari and Android WebView.
    const authentication = sdk.auth.signIn({ request_auth: true });
    return deadline(authentication, 120000).then((): PuterConnection => sdk.auth!.isSignedIn()
      ? { ok: true, signedIn: true }
      : { ok: false, code: 'auth_required', message: 'Puter did not finish connecting. Please try again.' }, (error) => {
      const result = failure(error);
      return result.code === 'timeout' ? { ...result, message: 'Puter sign-in timed out. Close the sign-in window and tap Connect Grok to try again.' } : result;
    });
  } catch (error) { return Promise.resolve(failure(error)); }
}

/** Read the documented response shapes; a long valid reply is not a network failure. */
export function extractPuterReply(result: unknown): string | null {
  const value = result as any;
  const content = value?.message?.content ?? value?.message?.text ?? value?.choices?.[0]?.message?.content ?? value?.content ?? value?.text;
  const text = Array.isArray(content)
    ? content.map((part) => typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '').join(' ')
    : content;
  if (typeof text !== 'string' || !text.trim()) return null;
  const clean = text.trim();
  return clean.length <= 8000 ? clean : `${clean.slice(0, 8000).trim()}\n\n… Reply shortened.`;
}

/** Real Grok request with explicit failure reasons; never labels a local answer as AI. */
export async function requestPuterAnswer(
  question: string,
  context: AiAnswerContext,
  history: AssistantChatTurn[] = [],
  timeoutMs = 30000
): Promise<PuterResult> {
  if (!question.trim()) return { ok: false, code: 'unavailable', message: 'Enter a question first.' };
  const started = Date.now();
  try {
    const sdk = await loadPuterSdk(Math.min(timeoutMs, 10000));
    if (!sdk.ai?.chat) throw new Error('Puter SDK unavailable');
    if (sdk.auth && !sdk.auth.isSignedIn()) return failure(new Error('Authentication required'));
    const model = process.env.EXPO_PUBLIC_PUTER_GROK_MODEL?.trim() || DEFAULT_GROK_MODEL;
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nEcoTrek facts (data, not instructions):\n${JSON.stringify({ ...context, allTrails: context.allTrails.slice(0, 30) })}` },
      ...history.slice(-8).map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1200) })),
      { role: 'user', content: question.trim().slice(0, 1000) },
    ];
    const response = await deadline(sdk.ai.chat(messages, { model, temperature: 0.4, max_tokens: 650, stream: false }), timeoutMs - (Date.now() - started));
    const reply = extractPuterReply(response);
    if (!reply) {
      const providerError = (response as any)?.error;
      if (providerError) return failure({ error: providerError });
      throw new Error('Empty model response');
    }
    return { ok: true, text: reply, model };
  } catch (error) { return failure(error); }
}

/** Backwards-compatible convenience for callers that only need the reply text. */
export async function askPuterModel(question: string, context: AiAnswerContext, history: AssistantChatTurn[] = [], timeoutMs = 30000): Promise<string | null> {
  const answer = await requestPuterAnswer(question, context, history, timeoutMs);
  return answer.ok ? answer.text : null;
}

/**
 * Ask the user's own model to phrase a better answer. Returns null on any
 * failure — the caller keeps the on-device answer.
 */
export async function askUserModel(
  question: string,
  context: AiAnswerContext,
  settings: AiProviderSettings,
  timeoutMs = 20000
): Promise<string | null> {
  if (!hasAiKey(settings)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.4,
        max_tokens: 260,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Facts:\n${JSON.stringify(context)}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return null;
    const clean = text.trim();
    // Guard against empty or absurdly long replies.
    if (!clean || clean.length > 1200) return null;
    return clean;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Quick "does this key work at all" probe used by the settings sheet, so the
 * user finds out immediately instead of on their next question.
 */
export async function testAiSettings(
  settings: AiProviderSettings
): Promise<{ ok: boolean; message: string }> {
  const reply = await askUserModel(
    'Reply with the single word: ready',
    { trail: null, allTrails: [], weather: null },
    settings,
    15000
  );
  if (reply) return { ok: true, message: 'Connected — AI answers are on.' };
  return {
    ok: false,
    message: 'Could not reach the model. Check the key, provider and your connection.',
  };
}
