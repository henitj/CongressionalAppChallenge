import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

/**
 * Live height of the software keyboard, in px. 0 when it is hidden.
 *
 * Why this exists: several screens put text inputs near the bottom of the
 * viewport (chat composer, bottom sheets). KeyboardAvoidingView alone has
 * been unreliable here — on Android inside a Modal the window does not
 * always resize, and on iOS a fixed `keyboardVerticalOffset` guesses the
 * header height and gets it wrong on notched devices. Tracking the real
 * keyboard frame lets each layout make room for exactly the space the
 * keyboard actually covers, so the input can never end up hidden behind it.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // `will*` fires early enough on iOS for the layout to move with the
    // keyboard animation; Android only emits `did*`.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
