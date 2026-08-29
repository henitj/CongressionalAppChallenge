import React from 'react';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/**
 * Line-icon set for EcoTrek.
 *
 * Every icon in the app comes from here. We deliberately do not use emoji in
 * the UI — emoji render differently on every device, look unprofessional at
 * small sizes, and cannot be recoloured to match the theme.
 *
 * Geometry is drawn on a 24x24 grid and scaled by the `size` prop.
 */

export type IconName =
  | 'home'
  | 'map'
  | 'map-pin'
  | 'navigation'
  | 'users'
  | 'user'
  | 'activity'
  | 'trending-up'
  | 'award'
  | 'crown'
  | 'target'
  | 'calendar'
  | 'clock'
  | 'bell'
  | 'bell-off'
  | 'sliders'
  | 'check'
  | 'check-circle'
  | 'circle'
  | 'x'
  | 'plus'
  | 'minus'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info'
  | 'shield'
  | 'cloud'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-lightning'
  | 'cloud-fog'
  | 'sun'
  | 'moon'
  | 'droplet'
  | 'wind'
  | 'thermometer'
  | 'zap'
  | 'flame'
  | 'lock'
  | 'unlock'
  | 'share'
  | 'log-out'
  | 'play'
  | 'pause'
  | 'stop'
  | 'bike'
  | 'boot'
  | 'leaf'
  | 'tree'
  | 'trash'
  | 'copy'
  | 'refresh'
  | 'star'
  | 'eye'
  | 'globe'
  | 'more-vertical'
  | 'filter'
  | 'search'
  | 'camera'
  | 'flag'
  | 'route'
  | 'mountain'
  | 'water'
  | 'battery'
  | 'download'
  | 'external-link'
  | 'help-circle'
  | 'pencil';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill the shape instead of stroking it (works for a subset of icons). */
  filled?: boolean;
};

export default function Icon({
  name,
  size = 22,
  color,
  strokeWidth = 1.8,
  filled = false,
}: Props) {
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

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, s, solid, filled)}
    </Svg>
  );
}

function render(name: IconName, s: any, solid: any, filled: boolean) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path {...s} d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" />
          <Path {...s} d="M9.5 21.5v-7h5v7" />
        </>
      );
    case 'map':
      return (
        <>
          <Path {...s} d="M2 6.5 8.5 3.5l7 3 6.5-3v14l-6.5 3-7-3-6.5 3z" />
          <Path {...s} d="M8.5 3.5v14M15.5 6.5v14" />
        </>
      );
    case 'map-pin':
      return (
        <>
          <Path {...s} d="M20 10.5c0 6-8 11.5-8 11.5S4 16.5 4 10.5a8 8 0 0 1 16 0z" />
          <Circle {...s} cx={12} cy={10.2} r={2.8} />
        </>
      );
    case 'navigation':
      return <Path {...s} d="M3 11 21.5 2.5 13 21l-2-7.5z" />;
    case 'route':
      return (
        <>
          <Circle {...s} cx={5.5} cy={18.5} r={2.5} />
          <Circle {...s} cx={18.5} cy={5.5} r={2.5} />
          <Path {...s} d="M8 18.5h5a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h5" />
        </>
      );
    case 'users':
      return (
        <>
          <Path {...s} d="M16 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21" />
          <Circle {...s} cx={9} cy={7.5} r={3.6} />
          <Path {...s} d="M22 21v-1.8a4 4 0 0 0-3-3.85M16.5 4.1a4 4 0 0 1 0 7.3" />
        </>
      );
    case 'user':
      return (
        <>
          <Path {...s} d="M20 21v-2a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 19v2" />
          <Circle {...s} cx={12} cy={7.5} r={4} />
        </>
      );
    case 'activity':
      return <Path {...s} d="M22 12h-4.5l-3 8-5-16-3 8H2" />;
    case 'trending-up':
      return (
        <>
          <Path {...s} d="M22 7 13.5 15.5l-4-4L2 19" />
          <Path {...s} d="M16.5 7H22v5.5" />
        </>
      );
    case 'award':
      return (
        <>
          <Circle {...s} cx={12} cy={8.5} r={6} />
          <Path {...s} d="M8.2 13.6 7 22l5-2.8L17 22l-1.2-8.4" />
        </>
      );
    case 'crown':
      return (
        <>
          <Path {...s} d="M3 18.5h18M3.5 18.5 2 6.5l5.5 4.5L12 3l4.5 8L22 6.5l-1.5 12" />
        </>
      );
    case 'target':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Circle {...s} cx={12} cy={12} r={5} />
          <Circle {...solid} cx={12} cy={12} r={1.8} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect {...s} x={3} y={5} width={18} height={16} rx={2.5} />
          <Path {...s} d="M16 3v4M8 3v4M3 10h18" />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M12 7v5.3l3.4 2" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...s} d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5z" />
          <Path {...s} d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      );
    case 'bell-off':
      return (
        <>
          <Path {...s} d="M13.7 21a2 2 0 0 1-3.4 0M18.6 13A18 18 0 0 1 18 8.5a6 6 0 0 0-9.3-5M5.9 5.9A6 6 0 0 0 6 8.5C6 15 3.5 17 3.5 17h13" />
          <Path {...s} d="M2 2l20 20" />
        </>
      );
    case 'sliders':
      return (
        <>
          <Path {...s} d="M4 21v-6.5M4 10.5V3M12 21v-9M12 8V3M20 21v-4.5M20 12.5V3" />
          <Path {...s} d="M1.5 14.5h5M9.5 8h5M17.5 16.5h5" />
        </>
      );
    case 'check':
      return <Path {...s} d="M20 6.5 9.5 17 4 11.5" />;
    case 'check-circle':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M8 12.2l2.8 2.8L16.5 9.3" />
        </>
      );
    case 'circle':
      return <Circle {...s} cx={12} cy={12} r={9} />;
    case 'x':
      return <Path {...s} d="M18 6 6 18M6 6l12 12" />;
    case 'plus':
      return <Path {...s} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...s} d="M5 12h14" />;
    case 'chevron-right':
      return <Path {...s} d="M9 18.5 15.5 12 9 5.5" />;
    case 'chevron-left':
      return <Path {...s} d="M15 18.5 8.5 12 15 5.5" />;
    case 'chevron-down':
      return <Path {...s} d="M5.5 9 12 15.5 18.5 9" />;
    case 'arrow-right':
      return (
        <>
          <Path {...s} d="M4 12h16" />
          <Path {...s} d="M13.5 5.5 20 12l-6.5 6.5" />
        </>
      );
    case 'arrow-up-right':
      return (
        <>
          <Path {...s} d="M7 17 17 7" />
          <Path {...s} d="M8.5 7H17v8.5" />
        </>
      );
    case 'alert-triangle':
      return (
        <>
          <Path
            {...s}
            d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
          />
          <Path {...s} d="M12 9.5v4.2" />
          <Circle {...solid} cx={12} cy={17.3} r={1.05} />
        </>
      );
    case 'alert-circle':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M12 7.5v5" />
          <Circle {...solid} cx={12} cy={16.2} r={1.05} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M12 16.5v-5" />
          <Circle {...solid} cx={12} cy={8} r={1.05} />
        </>
      );
    case 'help-circle':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
          <Circle {...solid} cx={12} cy={16.7} r={1.05} />
        </>
      );
    case 'pencil':
      return (
        <>
          <Path
            {...s}
            d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
          />
          {filled ? null : <Path {...s} d="m15 5 4 4" />}
        </>
      );
    case 'shield':
      return (
        <>
          <Path {...s} d="M12 22s8-3.8 8-9.7V5.4L12 2.4 4 5.4v6.9C4 18.2 12 22 12 22z" />
          {filled ? null : <Path {...s} d="M9 12l2.2 2.2L15.4 10" />}
        </>
      );
    case 'cloud':
      return (
        <Path {...s} d="M19 18.5H7.5A4.5 4.5 0 1 1 8.3 9.6 6.5 6.5 0 0 1 20.6 11a3.8 3.8 0 0 1-1.6 7.5z" />
      );
    case 'cloud-rain':
      return (
        <>
          <Path {...s} d="M19 15.5H7.5A4.5 4.5 0 1 1 8.3 6.6 6.5 6.5 0 0 1 20.6 8a3.8 3.8 0 0 1-1.6 7.5z" />
          <Path {...s} d="M8.5 18.5v2.5M12 18.5v3M15.5 18.5v2.5" />
        </>
      );
    case 'cloud-snow':
      return (
        <>
          <Path {...s} d="M19 15.5H7.5A4.5 4.5 0 1 1 8.3 6.6 6.5 6.5 0 0 1 20.6 8a3.8 3.8 0 0 1-1.6 7.5z" />
          <Circle {...solid} cx={8.5} cy={19.2} r={1} />
          <Circle {...solid} cx={12} cy={21} r={1} />
          <Circle {...solid} cx={15.5} cy={19.2} r={1} />
        </>
      );
    case 'cloud-lightning':
      return (
        <>
          <Path {...s} d="M18.5 14H7.5A4.5 4.5 0 1 1 8.3 5.1 6.5 6.5 0 0 1 20.1 6.5 3.8 3.8 0 0 1 18.5 14z" />
          {/* Bolt kept inside the 24x24 box so it is never clipped. */}
          <Path {...s} d="M13.4 15.5 9.8 19.8h3.1l-1 3.2" />
        </>
      );
    case 'cloud-fog':
      return (
        <>
          <Path {...s} d="M19 14.5H7.5A4.5 4.5 0 1 1 8.3 5.6 6.5 6.5 0 0 1 20.6 7a3.8 3.8 0 0 1-1.6 7.5z" />
          <Path {...s} d="M5 18h14M7.5 21.5h9" />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={4.5} />
          <Path
            {...s}
            d="M12 1.8v2.4M12 19.8v2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7"
          />
        </>
      );
    case 'moon':
      return <Path {...s} d="M21 13.4A9 9 0 1 1 10.6 3a7 7 0 0 0 10.4 10.4z" />;
    case 'droplet':
      return <Path {...s} d="M12 2.7 6.9 8.5a7.2 7.2 0 1 0 10.2 0z" />;
    case 'water':
      return (
        <>
          <Path {...s} d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" />
          <Path {...s} d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" />
        </>
      );
    case 'wind':
      return (
        <Path
          {...s}
          d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"
        />
      );
    case 'thermometer':
      return (
        <Path
          {...s}
          d="M14 14.8V4.5a2.5 2.5 0 0 0-5 0v10.3a4.2 4.2 0 1 0 5 0z"
        />
      );
    case 'zap':
      return <Path {...s} d="M13.2 2 4 13.5h7L10.8 22 20 10.5h-7z" />;
    case 'flame':
      return (
        <Path
          {...s}
          d="M12 22a6.5 6.5 0 0 0 6.5-6.5c0-5.5-6.5-13-6.5-13S9.4 6 9.4 9.2c0 1.5.7 2.4 1.2 3.1-1.9-.5-3.4 1.6-3.4 3.7A5.6 5.6 0 0 0 12 22z"
        />
      );
    case 'mountain':
      return (
        <>
          <Path {...s} d="M2 20h20L14.5 6.5 10.8 13 8.5 9.6z" />
          <Path {...s} d="M12.6 10.2 14.5 6.5" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect {...s} x={4} y={10.5} width={16} height={10.5} rx={2.4} />
          <Path {...s} d="M7.8 10.5V7.4a4.2 4.2 0 0 1 8.4 0v3.1" />
        </>
      );
    case 'unlock':
      return (
        <>
          <Rect {...s} x={4} y={10.5} width={16} height={10.5} rx={2.4} />
          <Path {...s} d="M7.8 10.5V7.4a4.2 4.2 0 0 1 8.1-1.4" />
        </>
      );
    case 'share':
      return (
        <>
          <Circle {...s} cx={18} cy={5.5} r={2.8} />
          <Circle {...s} cx={6} cy={12} r={2.8} />
          <Circle {...s} cx={18} cy={18.5} r={2.8} />
          <Path {...s} d="M8.5 10.6 15.5 6.9M8.5 13.4l7 3.7" />
        </>
      );
    case 'log-out':
      return (
        <>
          <Path {...s} d="M9.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h4" />
          <Path {...s} d="M16 16.5 20.5 12 16 7.5M20.5 12H9.5" />
        </>
      );
    case 'play':
      return <Polygon {...solid} points="6,3.5 20,12 6,20.5" />;
    case 'pause':
      return (
        <>
          <Rect {...solid} x={6.5} y={4} width={3.6} height={16} rx={1.4} />
          <Rect {...solid} x={13.9} y={4} width={3.6} height={16} rx={1.4} />
        </>
      );
    case 'stop':
      return <Rect {...solid} x={5.5} y={5.5} width={13} height={13} rx={2.4} />;
    case 'bike':
      return (
        <>
          <Circle {...s} cx={5.5} cy={17} r={3.6} />
          <Circle {...s} cx={18.5} cy={17} r={3.6} />
          <Path {...s} d="M5.5 17 10 8h4l4.5 9M10 8h6.5M9 17h6" />
          <Circle {...solid} cx={16.5} cy={5} r={1.4} />
        </>
      );
    case 'boot':
      return (
        <>
          <Path
            {...s}
            d="M6 3h4.2l.6 6.2c.2 1.6 1.3 2.4 2.9 2.7l3.6.7A3.5 3.5 0 0 1 20 16v3.5a1.5 1.5 0 0 1-1.5 1.5H6z"
          />
          <Path {...s} d="M6 16.5h13.6" />
        </>
      );
    case 'leaf':
      return (
        <>
          <Path {...s} d="M4 20c0-9 5.5-14 16-14 0 10-5 15-11.5 15A4.5 4.5 0 0 1 4 20z" />
          <Path {...s} d="M4.5 19.5C8 15 12 11.5 17 9.5" />
        </>
      );
    case 'tree':
      return (
        <>
          <Path {...s} d="M12 2.5 5.5 12h3.2L4 19h16l-4.7-7h3.2z" />
          <Path {...s} d="M12 19v3" />
        </>
      );
    case 'trash':
      return (
        <>
          <Path {...s} d="M3.5 6h17" />
          <Path {...s} d="M18.5 6v13.5A2 2 0 0 1 16.5 21.5h-9a2 2 0 0 1-2-2V6" />
          <Path {...s} d="M8.5 6V4.3a1.8 1.8 0 0 1 1.8-1.8h3.4A1.8 1.8 0 0 1 15.5 4.3V6" />
          <Path {...s} d="M10 10.5v6M14 10.5v6" />
        </>
      );
    case 'copy':
      return (
        <>
          <Rect {...s} x={8.5} y={8.5} width={12} height={12} rx={2.2} />
          <Path {...s} d="M4.8 15.5A2 2 0 0 1 3.5 13.6V5.5a2 2 0 0 1 2-2h8.1a2 2 0 0 1 1.9 1.3" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...s} d="M21.5 4.5v6h-6M2.5 19.5v-6h6" />
          <Path {...s} d="M4.6 9.5a8 8 0 0 1 13.2-3L21.5 10M2.5 14l3.7 3.5a8 8 0 0 0 13.2-3" />
        </>
      );
    case 'star':
      return (
        <Polygon
          {...(filled ? solid : s)}
          points="12,2.8 14.9,9 21.5,9.8 16.6,14.3 17.9,21 12,17.7 6.1,21 7.4,14.3 2.5,9.8 9.1,9"
        />
      );
    case 'eye':
      return (
        <>
          <Path {...s} d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
          <Circle {...s} cx={12} cy={12} r={3} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={9} />
          <Path {...s} d="M3 12h18" />
          <Path {...s} d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
        </>
      );
    case 'more-vertical':
      return (
        <>
          <Circle {...solid} cx={12} cy={5.5} r={1.6} />
          <Circle {...solid} cx={12} cy={12} r={1.6} />
          <Circle {...solid} cx={12} cy={18.5} r={1.6} />
        </>
      );
    case 'filter':
      return <Path {...s} d="M3 5h18l-7 8.2V20l-4 1.5v-8.3z" />;
    case 'search':
      return (
        <>
          <Circle {...s} cx={11} cy={11} r={7} />
          <Path {...s} d="M16.2 16.2 21 21" />
        </>
      );
    case 'camera':
      return (
        <>
          <Path
            {...s}
            d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.6-2.5h4.8L16 7h3a2 2 0 0 1 2 2z"
          />
          <Circle {...s} cx={12} cy={13.5} r={3.6} />
        </>
      );
    case 'flag':
      return (
        <>
          <Path {...s} d="M5 21V3.5h11l-1.6 4L16 12H5" />
          <Path {...s} d="M5 3.5V21" />
        </>
      );
    case 'battery':
      return (
        <>
          <Rect {...s} x={2} y={7.5} width={17} height={9} rx={2.2} />
          <Path {...s} d="M21.5 10.8v2.4" />
          <Rect {...solid} x={4.4} y={9.9} width={6} height={4.2} rx={1} />
        </>
      );
    case 'download':
      return (
        <>
          <Path {...s} d="M12 3.5v11" />
          <Path {...s} d="M7.5 10.5 12 15l4.5-4.5" />
          <Path {...s} d="M3.5 18.5h17" />
        </>
      );
    case 'external-link':
      return (
        <>
          <Path {...s} d="M13 4h7v7" />
          <Path {...s} d="M20 4 10.5 13.5" />
          <Path {...s} d="M18 14.5v4A2.5 2.5 0 0 1 15.5 21h-9A2.5 2.5 0 0 1 4 18.5v-9A2.5 2.5 0 0 1 6.5 7h4" />
        </>
      );
    default:
      return <Circle {...s} cx={12} cy={12} r={9} />;
  }
}
