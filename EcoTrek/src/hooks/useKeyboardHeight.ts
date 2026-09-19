import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, LayoutChangeEvent, Platform } from 'react-native';

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

/**
 * Bottom padding a full-height container needs so its lowest child clears
 * the keyboard — measured, not guessed.
 *
 * The trap this avoids: whether the OS already made room for the keyboard
 * depends on where the view lives. An Android Activity with
 * `softwareKeyboardLayoutMode: resize` shrinks the window itself; an RN
 * Modal's dialog window asks for ADJUST_RESIZE, which works on most Android
 * versions but is ignored under Android 15's enforced edge-to-edge; iOS
 * never resizes anything. Hard-coding per-platform behaviour breaks one of
 * these cases sooner or later.
 *
 * So instead: attach `onLayout` to a container that fills the available
 * height. We remember its tallest measurement (no keyboard) and compare
 * against the current one. Whatever the window already shrank is subtracted
 * from the keyboard height, and only the REMAINDER is returned as padding.
 * Window resized fully → pad 0. Window did not budge → pad the full
 * keyboard. Either way the input lands exactly above the keyboard.
 */
export function useKeyboardGap(): {
  gap: number;
  keyboardVisible: boolean;
  onContainerLayout: (e: LayoutChangeEvent) => void;
} {
  const keyboardHeight = useKeyboardHeight();
  const [containerHeight, setContainerHeight] = useState(0);
  const tallest = useRef(0);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > tallest.current) tallest.current = h;
    setContainerHeight(h);
  }, []);

  const alreadyShrunk = Math.max(0, tallest.current - containerHeight);
  const gap = keyboardHeight > 0 ? Math.max(0, keyboardHeight - alreadyShrunk) : 0;

  return { gap, keyboardVisible: keyboardHeight > 0, onContainerLayout };
}
