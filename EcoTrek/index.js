/**
 * App entry point.
 *
 * Gesture handler MUST be the first import on native or Android Expo Go
 * often stays on a blank splash and never mounts the tree.
 */
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
