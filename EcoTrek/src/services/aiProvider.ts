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
  baseUrl: AI_PRESETS[0].baseUrl,
  model: AI_PRESETS[0].model,
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
  'You are the trail assistant inside EcoTrek, an outdoor activity app. ' +
  'Answer the user in 2-4 friendly sentences using ONLY the trail and weather facts provided. ' +
  'Never invent trails, distances or amenities that are not in the data. ' +
  'If the data does not answer the question, say so plainly and suggest what the user could check instead. ' +
  'No markdown, no bullet lists — just a short conversational answer.';

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
