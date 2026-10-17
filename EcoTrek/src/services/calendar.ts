import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';

import { alert } from './alert';
import { buildIcsEvent, type HikePlan } from './social';

/**
 * "Add to calendar" without any calendar account or native calendar module:
 * we hand the system a standard .ics file. Phones and desktop calendar apps
 * all offer to import it, and on web it simply downloads.
 */
export async function shareCalendarEvent(plan: HikePlan): Promise<boolean> {
  const ics = buildIcsEvent(plan);
  const filename = `ecotrek-hike-${plan.id}.ics`;
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    }
    const file = new File(Paths.cache, filename);
    file.write(ics);
    await Share.share({
      title: `Hike: ${plan.trailName}`,
      message: `Hike planned: ${plan.trailName} — ${new Date(plan.startsAt).toLocaleString()}`,
      url: file.uri,
    });
    return true;
  } catch {
    // Last resort: the details as text still carry everything needed.
    alert(
      'Add it manually',
      `${plan.trailName}\n${new Date(plan.startsAt).toLocaleString()}\n${plan.area}`
    );
    return false;
  }
}
