import React from 'react';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/** Line icons on a 24×24 grid. No emoji — they cannot follow the theme. */

const ICONS = {
  home: 'p:M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z|p:M9.5 21.5v-7h5v7',
  map: 'p:M2 6.5 8.5 3.5l7 3 6.5-3v14l-6.5 3-7-3-6.5 3z|p:M8.5 3.5v14M15.5 6.5v14',
  'map-pin': 'p:M20 10.5c0 6-8 11.5-8 11.5S4 16.5 4 10.5a8 8 0 0 1 16 0z|c:12,10.2,2.8',
  navigation: 'p:M3 11 21.5 2.5 13 21l-2-7.5z',
  route: 'c:5.5,18.5,2.5|c:18.5,5.5,2.5|p:M8 18.5h5a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h5',
  users: 'p:M16 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21|c:9,7.5,3.6|p:M22 21v-1.8a4 4 0 0 0-3-3.85M16.5 4.1a4 4 0 0 1 0 7.3',
  user: 'p:M20 21v-2a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 19v2|c:12,7.5,4',
  activity: 'p:M22 12h-4.5l-3 8-5-16-3 8H2',
  'trending-up': 'p:M22 7 13.5 15.5l-4-4L2 19|p:M16.5 7H22v5.5',
  award: 'c:12,8.5,6|p:M8.2 13.6 7 22l5-2.8L17 22l-1.2-8.4',
  crown: 'p:M3 18.5h18M3.5 18.5 2 6.5l5.5 4.5L12 3l4.5 8L22 6.5l-1.5 12',
  target: 'c:12,12,9|c:12,12,5|cf:12,12,1.8',
  calendar: 'r:3,5,18,16,2.5|p:M16 3v4M8 3v4M3 10h18',
  clock: 'c:12,12,9|p:M12 7v5.3l3.4 2',
  bell: 'p:M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5z|p:M13.7 21a2 2 0 0 1-3.4 0',
  'bell-off': 'p:M13.7 21a2 2 0 0 1-3.4 0M18.6 13A18 18 0 0 1 18 8.5a6 6 0 0 0-9.3-5M5.9 5.9A6 6 0 0 0 6 8.5C6 15 3.5 17 3.5 17h13|p:M2 2l20 20',
  sliders: 'p:M4 21v-6.5M4 10.5V3M12 21v-9M12 8V3M20 21v-4.5M20 12.5V3|p:M1.5 14.5h5M9.5 8h5M17.5 16.5h5',
  check: 'p:M20 6.5 9.5 17 4 11.5',
  'check-circle': 'c:12,12,9|p:M8 12.2l2.8 2.8L16.5 9.3',
  circle: 'c:12,12,9',
  x: 'p:M18 6 6 18M6 6l12 12',
  plus: 'p:M12 5v14M5 12h14',
  minus: 'p:M5 12h14',
  'chevron-right': 'p:M9 18.5 15.5 12 9 5.5',
  'chevron-left': 'p:M15 18.5 8.5 12 15 5.5',
  'chevron-down': 'p:M5.5 9 12 15.5 18.5 9',
  'arrow-right': 'p:M4 12h16|p:M13.5 5.5 20 12l-6.5 6.5',
  'arrow-up-right': 'p:M7 17 17 7|p:M8.5 7H17v8.5',
  'alert-triangle': 'p:M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z|p:M12 9.5v4.2|cf:12,17.3,1.05',
  'alert-circle': 'c:12,12,9|p:M12 7.5v5|cf:12,16.2,1.05',
  info: 'c:12,12,9|p:M12 16.5v-5|cf:12,8,1.05',
  'help-circle': 'c:12,12,9|p:M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4|cf:12,16.7,1.05',
  pencil: 'p:M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z|p:m15 5 4 4',
  shield: 'p:M12 22s8-3.8 8-9.7V5.4L12 2.4 4 5.4v6.9C4 18.2 12 22 12 22z|p:M9 12l2.2 2.2L15.4 10',
  cloud: 'p:M19 18.5H7.5A4.5 4.5 0 1 1 8.3 9.6 6.5 6.5 0 0 1 20.6 11a3.8 3.8 0 0 1-1.6 7.5z',
  'cloud-rain': 'p:M19 15.5H7.5A4.5 4.5 0 1 1 8.3 6.6 6.5 6.5 0 0 1 20.6 8a3.8 3.8 0 0 1-1.6 7.5z|p:M8.5 18.5v2.5M12 18.5v3M15.5 18.5v2.5',
  'cloud-snow': 'p:M19 15.5H7.5A4.5 4.5 0 1 1 8.3 6.6 6.5 6.5 0 0 1 20.6 8a3.8 3.8 0 0 1-1.6 7.5z|cf:8.5,19.2,1|cf:12,21,1|cf:15.5,19.2,1',
  'cloud-lightning': 'p:M18.5 14H7.5A4.5 4.5 0 1 1 8.3 5.1 6.5 6.5 0 0 1 20.1 6.5 3.8 3.8 0 0 1 18.5 14z|p:M13.4 15.5 9.8 19.8h3.1l-1 3.2',
  'cloud-fog': 'p:M19 14.5H7.5A4.5 4.5 0 1 1 8.3 5.6 6.5 6.5 0 0 1 20.6 7a3.8 3.8 0 0 1-1.6 7.5z|p:M5 18h14M7.5 21.5h9',
  sun: 'c:12,12,4.5|p:M12 1.8v2.4M12 19.8v2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7',
  moon: 'p:M21 13.4A9 9 0 1 1 10.6 3a7 7 0 0 0 10.4 10.4z',
  droplet: 'p:M12 2.7 6.9 8.5a7.2 7.2 0 1 0 10.2 0z',
  water: 'p:M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0|p:M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0',
  wind: 'p:M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2',
  thermometer: 'p:M14 14.8V4.5a2.5 2.5 0 0 0-5 0v10.3a4.2 4.2 0 1 0 5 0z',
  zap: 'p:M13.2 2 4 13.5h7L10.8 22 20 10.5h-7z',
  flame: 'p:M12 22a6.5 6.5 0 0 0 6.5-6.5c0-5.5-6.5-13-6.5-13S9.4 6 9.4 9.2c0 1.5.7 2.4 1.2 3.1-1.9-.5-3.4 1.6-3.4 3.7A5.6 5.6 0 0 0 12 22z',
  mountain: 'p:M2 20h20L14.5 6.5 10.8 13 8.5 9.6z|p:M12.6 10.2 14.5 6.5',
  lock: 'r:4,10.5,16,10.5,2.4|p:M7.8 10.5V7.4a4.2 4.2 0 0 1 8.4 0v3.1',
  unlock: 'r:4,10.5,16,10.5,2.4|p:M7.8 10.5V7.4a4.2 4.2 0 0 1 8.1-1.4',
  share: 'c:18,5.5,2.8|c:6,12,2.8|c:18,18.5,2.8|p:M8.5 10.6 15.5 6.9M8.5 13.4l7 3.7',
  'log-out': 'p:M9.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h4|p:M16 16.5 20.5 12 16 7.5M20.5 12H9.5',
  play: 'gf:6,3.5 20,12 6,20.5',
  pause: 'rf:6.5,4,3.6,16,1.4|rf:13.9,4,3.6,16,1.4',
  stop: 'rf:5.5,5.5,13,13,2.4',
  bike: 'c:5.5,17,3.6|c:18.5,17,3.6|p:M5.5 17 10 8h4l4.5 9M10 8h6.5M9 17h6|cf:16.5,5,1.4',
  boot: 'p:M6 3h4.2l.6 6.2c.2 1.6 1.3 2.4 2.9 2.7l3.6.7A3.5 3.5 0 0 1 20 16v3.5a1.5 1.5 0 0 1-1.5 1.5H6z|p:M6 16.5h13.6',
  leaf: 'p:M4 20c0-9 5.5-14 16-14 0 10-5 15-11.5 15A4.5 4.5 0 0 1 4 20z|p:M4.5 19.5C8 15 12 11.5 17 9.5',
  tree: 'p:M12 2.5 5.5 12h3.2L4 19h16l-4.7-7h3.2z|p:M12 19v3',
  trash: 'p:M3.5 6h17|p:M18.5 6v13.5A2 2 0 0 1 16.5 21.5h-9a2 2 0 0 1-2-2V6|p:M8.5 6V4.3a1.8 1.8 0 0 1 1.8-1.8h3.4A1.8 1.8 0 0 1 15.5 4.3V6|p:M10 10.5v6M14 10.5v6',
  copy: 'r:8.5,8.5,12,12,2.2|p:M4.8 15.5A2 2 0 0 1 3.5 13.6V5.5a2 2 0 0 1 2-2h8.1a2 2 0 0 1 1.9 1.3',
  refresh: 'p:M21.5 4.5v6h-6M2.5 19.5v-6h6|p:M4.6 9.5a8 8 0 0 1 13.2-3L21.5 10M2.5 14l3.7 3.5a8 8 0 0 0 13.2-3',
  star: 'g:12,2.8 14.9,9 21.5,9.8 16.6,14.3 17.9,21 12,17.7 6.1,21 7.4,14.3 2.5,9.8 9.1,9',
  eye: 'p:M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z|c:12,12,3',
  globe: 'c:12,12,9|p:M3 12h18|p:M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z',
  'more-vertical': 'cf:12,5.5,1.6|cf:12,12,1.6|cf:12,18.5,1.6',
  filter: 'p:M3 5h18l-7 8.2V20l-4 1.5v-8.3z',
  search: 'c:11,11,7|p:M16.2 16.2 21 21',
  camera: 'p:M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.6-2.5h4.8L16 7h3a2 2 0 0 1 2 2z|c:12,13.5,3.6',
  flag: 'p:M5 21V3.5h11l-1.6 4L16 12H5|p:M5 3.5V21',
  battery: 'r:2,7.5,17,9,2.2|p:M21.5 10.8v2.4|rf:4.4,9.9,6,4.2,1',
  download: 'p:M12 3.5v11|p:M7.5 10.5 12 15l4.5-4.5|p:M3.5 18.5h17',
  'external-link': 'p:M13 4h7v7|p:M20 4 10.5 13.5|p:M18 14.5v4A2.5 2.5 0 0 1 15.5 21h-9A2.5 2.5 0 0 1 4 18.5v-9A2.5 2.5 0 0 1 6.5 7h4',
  gift: 'r:3,8,18,4,1|p:M12 8v13|p:M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7|p:M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 4.5 12 8c1-3.5 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5',
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
};

export default function Icon({ name, size = 22, color, strokeWidth = 1.8, filled = false }: Props) {
  const { colors } = useTheme();
  const resolved = color ?? colors.text;
  const s = {
    stroke: resolved,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const solid = { fill: resolved, stroke: 'none' };

  let def: string = ICONS[name] ?? 'c:12,12,9';
  if (name === 'star' && filled) def = 'gf:' + def.slice(2);
  if ((name === 'pencil' || name === 'shield') && filled) def = def.split('|')[0];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {def.split('|').map((part, i) => {
        const colon = part.indexOf(':');
        const kind = part.slice(0, colon);
        const data = part.slice(colon + 1);
        const n = data.split(',').map(Number);
        if (kind === 'p') return <Path key={i} {...s} d={data} />;
        if (kind === 'c') return <Circle key={i} {...s} cx={n[0]} cy={n[1]} r={n[2]} />;
        if (kind === 'cf') return <Circle key={i} {...solid} cx={n[0]} cy={n[1]} r={n[2]} />;
        if (kind === 'r') return <Rect key={i} {...s} x={n[0]} y={n[1]} width={n[2]} height={n[3]} rx={n[4] ?? 0} />;
        if (kind === 'rf') return <Rect key={i} {...solid} x={n[0]} y={n[1]} width={n[2]} height={n[3]} rx={n[4] ?? 0} />;
        if (kind === 'g') return <Polygon key={i} {...s} points={data} />;
        if (kind === 'gf') return <Polygon key={i} {...solid} points={data} />;
        return null;
      })}
    </Svg>
  );
}
