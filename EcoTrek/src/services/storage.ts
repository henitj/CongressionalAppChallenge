import { mergeAccountData } from './mergeAccountData';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Date helpers live in a react-native-free module so they can be unit tested.
export { dayKey, daysBetween, addDays, weekKey, weekStart, weekEnd } from './dates';

/**
 * Namespaced local storage.
 *
 * Everything is keyed per-user so two accounts on one phone never see each
 * other's data, and signing out doesn't leak stats into a guest session.
 */

const PREFIX = '@ecotrek';
const pending = new Map<string, Promise<void>>();

export function keyFor(userId: string | null | undefined, name: string) {
  return `${PREFIX}/${userId ?? 'anon'}/${name}`;
}

export async function loadJSON<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => boolean
): Promise<T> {
  try {
    await pending.get(key);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // A stored value of the wrong shape (truncated write, schema drift, a
    // hand-edited store) must fall back to defaults, never flow into the app.
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Validator for array-valued keys: anything but an array falls back. */
export const isArray = Array.isArray;

/** Validator for object-valued keys: null and arrays fall back. */
export function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function saveJSON(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  const write = (pending.get(key) ?? Promise.resolve()).then(() => AsyncStorage.setItem(key, json))
    .catch((e) => { console.warn('[storage] save failed', key, e); });
  pending.set(key, write);
  void write.then(() => { if (pending.get(key) === write) pending.delete(key); });
  return write;
}

export async function removeKey(key: string): Promise<void> {
  try {
    await pending.get(key);
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Copies or merges a guest's local data without replacing existing account records.
 * Used so a guest can sign in with Google without losing walks.
 */
export async function copyUserData(fromId: string, toId: string): Promise<number> {
  if (!fromId || !toId || fromId === toId) return 0;
  try {
    await Promise.all(pending.values());
    const all = await AsyncStorage.getAllKeys();
    const prefix = `${PREFIX}/${fromId}/`;
    const mine = all.filter((k) => k.startsWith(prefix));
    let copied = 0;
    for (const key of mine) {
      const dest = `${PREFIX}/${toId}/${key.slice(prefix.length)}`;
      const existing = await AsyncStorage.getItem(dest);
      const val = await AsyncStorage.getItem(key);
      if (val == null) continue;
      const merged = existing ? mergeAccountData(key.slice(prefix.length), JSON.parse(val), JSON.parse(existing)) : JSON.parse(val);
      await saveJSON(dest, merged);
      copied += 1;
    }
    return copied;
  } catch (e) {
    console.warn('[storage] copy failed', e);
    return 0;
  }
}

/** Wipes every EcoTrek key for one user (used by "delete my data"). */
export async function clearUserData(userId: string | null | undefined) {
  try {
    await Promise.all(pending.values());
    const all = await AsyncStorage.getAllKeys();
    const mine = all.filter((k) => k.startsWith(`${PREFIX}/${userId ?? 'anon'}/`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch (e) {
    console.warn('[storage] clear failed', e);
  }
}
