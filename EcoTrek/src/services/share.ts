import { Alert, Platform, Share } from 'react-native';

/**
 * Share a plain-text message.
 *
 * Native uses the system share sheet. On web that API is often missing, which
 * is why "Share my impact" used to do nothing — we fall back to the clipboard
 * and tell the person they can paste it.
 */
export async function shareText(message: string, title = 'EcoTrek'): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, text: message });
        return true;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(message);
        Alert.alert('Copied', 'Your message was copied. Paste it into a text or email to share it.');
        return true;
      }
      Alert.alert(title, message);
      return true;
    }

    const result = await Share.share({ message, title });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
