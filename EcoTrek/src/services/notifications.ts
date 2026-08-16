import { Platform } from 'react-native';

/**
 * Local notifications.
 *
 * Everything here uses *local* scheduled notifications, which means:
 *   • no Firebase Cloud Messaging setup
 *   • no push server
 *   • no API keys
 *   • works forever without you touching it
 *
 * expo-notifications is loaded lazily so the app still runs on web and in any
 * environment where the native module isn't present.
 */

let Notifications: any = null;
let loadFailed = false;

function getModule() {
  if (Notifications || loadFailed) return Notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    loadFailed = true;
    Notifications = null;
  }
  return Notifications;
}

export function notificationsSupported(): boolean {
  return Platform.OS !== 'web' && getModule() !== null;
}

export const CHANNELS = {
  reminders: 'ecotrek-reminders',
  safety: 'ecotrek-safety',
};

export const IDENTIFIERS = {
  streak: 'streak-reminder',
  challenge: 'challenge-reminder',
};

/* ── Permissions ──────────────────────────────────────────────────────────── */

export async function requestPermission(): Promise<boolean> {
  const N = getModule();
  if (!N || Platform.OS === 'web') return false;

  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNELS.reminders, {
        name: 'Reminders',
        importance: N.AndroidImportance.DEFAULT,
        description: 'Streak and weekly challenge reminders',
      });
      await N.setNotificationChannelAsync(CHANNELS.safety, {
        name: 'Trail safety alerts',
        importance: N.AndroidImportance.HIGH,
        description: 'Severe weather warnings before you head out',
      });
    }

    const existing = await N.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;

    const req = await N.requestPermissionsAsync();
    return !!req.granted;
  } catch (e) {
    console.warn('[notifications] permission error', e);
    return false;
  }
}

export async function hasPermission(): Promise<boolean> {
  const N = getModule();
  if (!N || Platform.OS === 'web') return false;
  try {
    const p = await N.getPermissionsAsync();
    return !!p.granted;
  } catch {
    return false;
  }
}

/* ── Scheduling ───────────────────────────────────────────────────────────── */

async function cancel(identifier: string) {
  const N = getModule();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(identifier);
  } catch {
    /* nothing scheduled under that id — fine */
  }
}

/**
 * Daily nudge at `hour` local time. We reschedule it every launch so it always
 * reflects the user's current streak length.
 */
export async function scheduleStreakReminder(streak: number, hour = 18) {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;

  await cancel(IDENTIFIERS.streak);

  const body =
    streak >= 2
      ? `Your ${streak}-day streak ends at midnight. A short walk keeps it alive.`
      : 'Log any hike or ride today to start a streak.';

  try {
    await N.scheduleNotificationAsync({
      identifier: IDENTIFIERS.streak,
      content: {
        title: streak >= 2 ? `Keep your ${streak}-day streak` : 'Get outside today',
        body,
        ...(Platform.OS === 'android' ? { channelId: CHANNELS.reminders } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('[notifications] streak schedule failed', e);
  }
}

/** Saturday morning: "2 challenges left, they reset Monday." */
export async function scheduleChallengeReminder(remaining: number) {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;

  await cancel(IDENTIFIERS.challenge);
  if (remaining <= 0) return;

  try {
    await N.scheduleNotificationAsync({
      identifier: IDENTIFIERS.challenge,
      content: {
        title: 'Weekly challenges reset Monday',
        body: `You have ${remaining} challenge${remaining === 1 ? '' : 's'} left. Each one adds points to your club.`,
        ...(Platform.OS === 'android' ? { channelId: CHANNELS.reminders } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 7, // Saturday (1 = Sunday)
        hour: 10,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('[notifications] challenge schedule failed', e);
  }
}

/** Immediate heads-up when conditions turn dangerous. Deduped per day+reason. */
const sentSafety = new Set<string>();

export async function sendSafetyAlert(title: string, body: string, dedupeKey: string) {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;
  if (sentSafety.has(dedupeKey)) return;
  sentSafety.add(dedupeKey);

  try {
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        ...(Platform.OS === 'android' ? { channelId: CHANNELS.safety } : {}),
      },
      trigger: null, // deliver now
    });
  } catch (e) {
    console.warn('[notifications] safety alert failed', e);
  }
}

export async function cancelAll() {
  const N = getModule();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}
