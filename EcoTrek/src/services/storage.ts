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

/**
 * Copies one account's local data onto another when the destination is empty.
 * Used so a guest can sign in with Google without losing walks.
 */
export async function copyUserData(fromId: string, toId: string): Promise<number> {
  if (!fromId || !toId || fromId === toId) return 0;
  try {
    const all = await AsyncStorage.getAllKeys();
    const prefix = `${PREFIX}/${fromId}/`;
    const mine = all.filter((k) => k.startsWith(prefix));
    let copied = 0;
    for (const key of mine) {
      const dest = `${PREFIX}/${toId}/${key.slice(prefix.length)}`;
      const existing = await AsyncStorage.getItem(dest);
      if (existing) continue;
      const val = await AsyncStorage.getItem(key);
      if (val == null) continue;
      await AsyncStorage.setItem(dest, val);
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
    const all = await AsyncStorage.getAllKeys();
    const mine = all.filter((k) => k.startsWith(`${PREFIX}/${userId ?? 'anon'}/`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch (e) {
    console.warn('[storage] clear failed', e);
  }
}
