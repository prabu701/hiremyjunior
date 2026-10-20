import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

// Stroke icons from the prototype (24×24 viewBox, round caps/joins).
export type IconName =
  | 'user' | 'shield' | 'briefcase' | 'chevronRight' | 'chevronLeft' | 'info' | 'check' | 'mail' | 'palette' | 'logout'
  | 'home' | 'search' | 'calendar' | 'users' | 'copy' | 'clock' | 'mapPin' | 'camera' | 'star' | 'plus' | 'x' | 'phone' | 'idCard' | 'alert' | 'dollar';

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...common}>
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21v-1a7 7 0 0 1 14 0v1" />
        </>
      )}
      {name === 'shield' && <Path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />}
      {name === 'briefcase' && (
        <>
          <Rect x="3" y="7" width="18" height="13" rx="0" />
          <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      )}
      {name === 'chevronRight' && <Polyline points="9 18 15 12 9 6" />}
      {name === 'chevronLeft' && <Polyline points="15 18 9 12 15 6" />}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="8" x2="12" y2="12" />
          <Line x1="12" y1="16" x2="12.01" y2="16" />
        </>
      )}
      {name === 'check' && <Path d="M20 6L9 17l-5-5" />}
      {name === 'mail' && (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="0" />
          <Polyline points="3 7 12 13 21 7" />
        </>
      )}
      {name === 'palette' && (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Circle cx="8" cy="10" r="1.2" />
          <Circle cx="12" cy="7.5" r="1.2" />
          <Circle cx="16" cy="10" r="1.2" />
          <Path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a2.5 2.5 0 0 0 2.5-2.5" />
        </>
      )}
      {name === 'logout' && (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Polyline points="16 17 21 12 16 7" />
          <Line x1="21" y1="12" x2="9" y2="12" />
        </>
      )}
      {name === 'home' && (
        <>
          <Path d="M3 11l9-8 9 8" />
          <Path d="M5 10v10h14V10" />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="7" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="0" />
          <Line x1="16" y1="3" x2="16" y2="7" />
          <Line x1="8" y1="3" x2="8" y2="7" />
          <Line x1="3" y1="11" x2="21" y2="11" />
        </>
      )}
      {name === 'users' && (
        <>
          <Circle cx="9" cy="8" r="3.5" />
          <Path d="M2 21v-1a6 6 0 0 1 12 0v1" />
          <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
          <Path d="M18 14.5a6 6 0 0 1 4 5.5v1" />
        </>
      )}
      {name === 'copy' && (
        <>
          <Rect x="9" y="9" width="12" height="12" rx="0" />
          <Path d="M5 15H3V3h12v2" />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Polyline points="12 7 12 12 15 14" />
        </>
      )}
      {name === 'mapPin' && (
        <>
          <Path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
          <Circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === 'camera' && (
        <>
          <Path d="M3 8h4l2-3h6l2 3h4v12H3z" />
          <Circle cx="12" cy="13" r="3.5" />
        </>
      )}
      {name === 'star' && <Path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z" />}
      {name === 'plus' && (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </>
      )}
      {name === 'x' && (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" />
          <Line x1="18" y1="6" x2="6" y2="18" />
        </>
      )}
      {name === 'phone' && <Path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />}
      {name === 'idCard' && (
        <>
          <Rect x="2" y="5" width="20" height="14" rx="0" />
          <Circle cx="8" cy="12" r="2.5" />
          <Line x1="13" y1="10" x2="18" y2="10" />
          <Line x1="13" y1="14" x2="17" y2="14" />
        </>
      )}
      {name === 'alert' && (
        <>
          <Path d="M12 3l10 18H2z" />
          <Line x1="12" y1="10" x2="12" y2="14" />
          <Line x1="12" y1="17.5" x2="12.01" y2="17.5" />
        </>
      )}
      {name === 'dollar' && (
        <>
          <Line x1="12" y1="2" x2="12" y2="22" />
          <Path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </>
      )}
    </Svg>
  );
}
