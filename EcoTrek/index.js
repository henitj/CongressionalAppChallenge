/**
 * App entry point.
 *
 * SDK 57's recommended entry: register the root component explicitly instead
 * of relying on the deprecated `expo/AppEntry.js` re-export. `App.tsx` still
 * does all the work — this file only wires it up.
 */
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
