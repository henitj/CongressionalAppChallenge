import { Platform } from 'react-native';

import { createStepDetector, GRAVITY } from './steps';

/** listening: motion readings are arriving. nosignal: none arrived. */
export type StepSensorStatus = 'listening' | 'nosignal';

export type StepSubscription = { remove: () => void };

const NONE: StepSubscription = { remove: () => {} };
/** How long to wait for the first reading before saying there is no signal. */
const SIGNAL_WAIT_MS = 4000;

let motionAnswer: Promise<boolean> | null = null;

/**
 * iPhones only show the motion prompt from inside a tap. Call this at the top
 * of the Start button's handler so the answer is ready when tracking begins.
 * Browsers without a prompt resolve true immediately; a failure never throws.
 */
export function primeMotionPermission(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return Promise.resolve(true);
  const DME = (window as any).DeviceMotionEvent;
  if (!DME || typeof DME.requestPermission !== 'function') return Promise.resolve(true);
  if (!motionAnswer) {
    motionAnswer = Promise.resolve()
      .then(() => DME.requestPermission())
      .then((answer: string) => answer === 'granted')
      .catch(() => false);
  }
  return motionAnswer;
}

/**
 * Starts counting footsteps from the motion sensor.
 *
 *   • Web / Android WebView — the browser `devicemotion` event. The listener
 *     is always attached; if the browser (or an iPhone the user said no on)
 *     sends nothing, `onStatus('nosignal')` fires and GPS carries the walk.
 *   • iOS / Android app — expo-sensors' accelerometer.
 *
 * `onSteps` receives the running total each time it changes. Nothing from the
 * sensor is recorded or stored; only the step count is kept.
 */
export async function startStepCounting(
  onSteps: (total: number, at: number) => void,
  onStatus?: (status: StepSensorStatus) => void
): Promise<StepSubscription> {
  const detector = createStepDetector();
  let samples = 0;
  const feed = (tMs: number, g: number) => {
    samples += 1;
    const before = detector.steps;
    if (detector.push(tMs, g) > 0 && detector.steps !== before) onSteps(detector.steps, tMs);
  };
  const watchdog = setTimeout(() => onStatus?.(samples > 0 ? 'listening' : 'nosignal'), SIGNAL_WAIT_MS);
  const finish = (remove: () => void): StepSubscription => ({
    remove: () => {
      clearTimeout(watchdog);
      remove();
    },
  });

  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        onStatus?.('nosignal');
        return finish(() => {});
      }
      await primeMotionPermission();
      const handler = (e: any) => {
        const a = e?.accelerationIncludingGravity ?? e?.acceleration;
        if (!a || a.x == null || a.y == null || a.z == null) return;
        const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) / GRAVITY;
        feed(Date.now(), magnitude);
      };
      window.addEventListener('devicemotion', handler);
      return finish(() => window.removeEventListener('devicemotion', handler));
    }

    // A plain require keeps the web export a single bundle; the web branch
    // above never reaches this line.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Accelerometer } = require('expo-sensors') as typeof import('expo-sensors');
    if (!(await Accelerometer.isAvailableAsync())) {
      onStatus?.('nosignal');
      return finish(() => {});
    }
    Accelerometer.setUpdateInterval(20);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // expo-sensors reports g already.
      feed(Date.now(), Math.sqrt(x * x + y * y + z * z));
    });
    return finish(() => sub.remove());
  } catch {
    clearTimeout(watchdog);
    onStatus?.('nosignal');
    return NONE;
  }
}
