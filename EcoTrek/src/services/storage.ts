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

export function keyFor(userId: string | null | undefined, name: string) {
  return `${PREFIX}/${userId ?? 'anon'}/${name}`;
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] save failed', key, e);
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Wipes every EcoTrek key for one user (used by "delete my data"). */
export async function clearUserData(userId: string | null | undefined) {
  try {
    const all = await AsyncStorage.getAllKeys();
    const mine = all.filter((k) => k.startsWith(`${PREFIX}/${userId ?? 'anon'}/`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch (e) {
    console.warn('[storage] clear failed', e);
  }
}
