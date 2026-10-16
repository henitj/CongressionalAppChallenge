import { Platform, Share } from 'react-native';
import { alert } from './alert';

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
        alert('Copied', 'Your message was copied. Paste it into a text or email to share it.');
        return true;
      }
      alert(title, message);
      return true;
    }

    const result = await Share.share({ message, title });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

/**
 * Share a captured postcard image (react-native-view-shot URI).
 * Native: the system share sheet with the image attached.
 * Web: a real File via navigator.share when supported, otherwise the image
 * downloads so it can be posted manually — it never silently does nothing.
 */
export async function shareImage(uri: string, message: string, title = 'EcoTrek'): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      try {
        const blob = await (await fetch(uri)).blob();
        const file = new File([blob], 'ecotrek-postcard.png', { type: blob.type || 'image/png' });
        const navAny = nav as any;
        if (navAny && typeof navAny.share === 'function' && (!navAny.canShare || navAny.canShare({ files: [file] }))) {
          await navAny.share({ title, text: message, files: [file] });
          return true;
        }
      } catch {
        /* fall through to download */
      }
      const a = document.createElement('a');
      a.href = uri;
      a.download = 'ecotrek-postcard.png';
      a.click();
      alert('Postcard saved', 'Your postcard image downloaded — you can post it anywhere.');
      return true;
    }
    const result = await Share.share({
      title,
      message,
      url: uri,
    });
    return result.action !== Share.dismissedAction;
  } catch {
    return shareText(message, title);
  }
}
