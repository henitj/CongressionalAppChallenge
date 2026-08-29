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
  recap: 'weekly-recap',
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
 * Evening nudge at `hour` local time. We reschedule it every launch so it
 * always reflects the user's current streak.
 *
 * The streak is measured in WEEKS (a week counts once you have logged at
 * least one activity in it), so the copy says weeks — saying "day streak"
 * here used to confuse everyone who opened it.
 */
export async function scheduleStreakReminder(streak: number, hour = 18, activeThisWeek = false) {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;

  await cancel(IDENTIFIERS.streak);

  // Three accurate states, each saying something true:
  let title: string;
  let body: string;
  if (activeThisWeek) {
    title = `Your ${streak}-week streak is safe`;
    body = 'You have already been out this week, so there is nothing to do. Enjoy the rest of it.';
  } else if (streak >= 1) {
    title = `Keep your ${streak}-week streak going`;
    body = 'Log one walk or ride this week to keep it alive. Ten minutes counts.';
  } else {
    title = 'Start a weekly streak';
    body = 'Log one walk or ride this week. That is all it takes — then just keep going.';
  }

  try {
    await N.scheduleNotificationAsync({
      identifier: IDENTIFIERS.streak,
      content: {
        title,
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

/** Saturday morning: tells you exactly what is left and when it resets. */
export async function scheduleChallengeReminder(remaining: number) {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;

  await cancel(IDENTIFIERS.challenge);
  if (remaining <= 0) return;

  const body =
    remaining === 1
      ? 'You have one left before they reset Monday. It only takes a few minutes.'
      : `You have ${remaining} left before they reset Monday. Pick one — most take less than 15 minutes.`;

  try {
    await N.scheduleNotificationAsync({
      identifier: IDENTIFIERS.challenge,
      content: {
        title: remaining === 1 ? 'One challenge left this week' : `${remaining} challenges left this week`,
        body,
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

/**
 * Sunday evening: the week just closed, go and look at it.
 *
 * The body is deliberately generic. A scheduled local notification is composed
 * when it is scheduled, not when it fires, so it cannot quote figures that
 * would be days out of date by the time it arrives.
 */
export async function scheduleWeeklyRecap() {
  const N = getModule();
  if (!N || Platform.OS === 'web') return;

  await cancel(IDENTIFIERS.recap);

  try {
    await N.scheduleNotificationAsync({
      identifier: IDENTIFIERS.recap,
      content: {
        title: 'Your week is wrapped up',
        body: 'Open your recap for the numbers that matter — miles, trees, streak and challenges. Takes 30 seconds.',
        ...(Platform.OS === 'android' ? { channelId: CHANNELS.reminders } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday (1 = Sunday)
        hour: 18,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('[notifications] recap schedule failed', e);
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
