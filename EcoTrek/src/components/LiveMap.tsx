import { Platform } from 'react-native';

let LiveMapComponent: any;

if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LiveMapComponent = require('./LiveMap.web').default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LiveMapComponent = require('./LiveMap.native').default;
}

export default LiveMapComponent;
