import { Alert as RNAlert, Platform } from 'react-native';

/**
 * Cross-platform alert dialogs.
 *
 * `Alert.alert` from react-native is a complete no-op on web — react-native-web
 * ships `class Alert { static alert() {} }`. Since this app's Android build is
 * a WebView shell around the Expo *web* export (see android-shell/README.md),
 * every single call to `Alert.alert(...)` across the whole app — sign out,
 * delete activity, erase data, leave a club, "turn on location in Settings",
 * the weather warning before starting a hike, the avatar photo picker — was
 * silently doing nothing on every platform this app actually ships on.
 *
 * `alert(...)` has the same call shape as `Alert.alert` so call sites don't
 * change. On native it defers straight to the real RN Alert. On web it hands
 * the request to whichever <AlertHost /> is mounted (once, near the app
 * root), which renders an actual themed dialog using the same Modal/Sheet
 * machinery as the rest of the app.
 */

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (request: AlertRequest) => void;

let listener: Listener | null = null;
let nextId = 1;

export function registerAlertHost(fn: Listener | null) {
  listener = fn;
}

export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  const finalButtons: AlertButton[] = buttons && buttons.length ? buttons : [{ text: 'OK' }];

  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, finalButtons as any);
    return;
  }

  if (listener) {
    listener({ id: nextId++, title, message, buttons: finalButtons });
    return;
  }

  // AlertHost should always be mounted before any screen can call this, but
  // fall back to a native browser confirm rather than swallowing the
  // request if something calls alert() before the host is ready.
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const text = message ? `${title}\n\n${message}` : title;
    const destructive = finalButtons.find((b) => b.style !== 'cancel');
    const cancelBtn = finalButtons.find((b) => b.style === 'cancel');
    if (finalButtons.length <= 1) {
      window.alert(text);
      finalButtons[0]?.onPress?.();
    } else if (window.confirm(text)) {
      destructive?.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  }
}
