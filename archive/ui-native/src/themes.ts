// Design tokens lifted verbatim from docs/HireMyJunior — Spark Prototype (THEMES + SWATCH_INFO).
import type { CornerStyle, ThemeKey } from '@hmj/shared';

export type { CornerStyle, ThemeKey };

export interface Theme {
  bg: string;
  text: string;
  muted: string;
  card: string;
  shadow: string;
  accent: string;
  /** Text/icon colour on top of `accent`. */
  onAccent: string;
  navInactive: string;
  navBg: string;
  navBorder: string;
  avatarBg: string;
  avatarText: string;
  chipActiveBg: string;
  chipActiveText: string;
  chipBg: string;
  chipText: string;
  tint1: string;
  tint1c: string;
  tint2: string;
  tint2c: string;
  tint3: string;
  tint3c: string;
  /** Error colour — not in the prototype; chosen to read on every background. */
  danger: string;
  dark: boolean;
}

export const THEMES: Record<ThemeKey, Theme> = {
  citrus: { bg: '#FDF6EC', text: '#241D18', muted: '#A08E7C', card: '#FFFFFF', shadow: 'rgba(178,96,16,0.08)', accent: '#FF6B35', onAccent: '#FFFFFF', navInactive: '#C2B4A4', navBg: '#FFFCF8', navBorder: '#F2E6D8', avatarBg: '#FFDCC2', avatarText: '#B34700', chipActiveBg: '#241D18', chipActiveText: '#FDF6EC', chipBg: '#FFFFFF', chipText: '#A08E7C', tint1: '#FFE1CC', tint1c: '#B34700', tint2: '#E7E1FF', tint2c: '#5B3FD9', tint3: '#D7F5E3', tint3c: '#1D8A54', danger: '#C62828', dark: false },
  electric: { bg: '#F6F3FF', text: '#1E1B2E', muted: '#8A82A6', card: '#FFFFFF', shadow: 'rgba(91,63,217,0.10)', accent: '#7C5CFC', onAccent: '#FFFFFF', navInactive: '#C9C2E0', navBg: '#FBFAFF', navBorder: '#E9E4FF', avatarBg: '#E9E4FF', avatarText: '#5B3FD9', chipActiveBg: '#1E1B2E', chipActiveText: '#F6F3FF', chipBg: '#FFFFFF', chipText: '#8A82A6', tint1: '#E9E4FF', tint1c: '#5B3FD9', tint2: '#FFF3C4', tint2c: '#9A7B00', tint3: '#D8F5E9', tint3c: '#1D8A6B', danger: '#C62828', dark: false },
  sunset: { bg: '#FFF3F0', text: '#2B1815', muted: '#B08A85', card: '#FFFFFF', shadow: 'rgba(196,34,90,0.09)', accent: '#FF4F81', onAccent: '#FFFFFF', navInactive: '#E3C6C6', navBg: '#FFF8F6', navBorder: '#FADCDC', avatarBg: '#FFD9DE', avatarText: '#C4225A', chipActiveBg: '#2B1815', chipActiveText: '#FFF3F0', chipBg: '#FFFFFF', chipText: '#B08A85', tint1: '#FFD9DE', tint1c: '#C4225A', tint2: '#FFEBB0', tint2c: '#9A6B00', tint3: '#FFE3C2', tint3c: '#B3560A', danger: '#B3261E', dark: false },
  midnight: { bg: '#17171F', text: '#F4F1EC', muted: '#8B8798', card: '#211F2B', shadow: 'rgba(0,0,0,0.35)', accent: '#FF6B35', onAccent: '#FFFFFF', navInactive: '#5A5568', navBg: '#1B1A24', navBorder: '#2C2938', avatarBg: '#3A2A1E', avatarText: '#FFB37A', chipActiveBg: '#F4F1EC', chipActiveText: '#17171F', chipBg: '#211F2B', chipText: '#8B8798', tint1: '#3A2A1E', tint1c: '#FFB37A', tint2: '#2B2740', tint2c: '#B8A6FF', tint3: '#1E332B', tint3c: '#6FE3A8', danger: '#FF8A80', dark: true },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = 'midnight';
export const DEFAULT_CORNERS: CornerStyle = 'sharp';

export const SWATCHES: { key: ThemeKey; name: string; desc: string; bg: string; accent: string }[] = [
  { key: 'citrus', name: 'Citrus', desc: 'Warm cream & tangerine', bg: '#FDF6EC', accent: '#FF6B35' },
  { key: 'electric', name: 'Electric Violet', desc: 'Cool lavender & violet', bg: '#F6F3FF', accent: '#7C5CFC' },
  { key: 'sunset', name: 'Sunset Coral', desc: 'Soft blush & hot coral', bg: '#FFF3F0', accent: '#FF4F81' },
  { key: 'midnight', name: 'Midnight', desc: 'Dark mode, tangerine pop', bg: '#17171F', accent: '#FF6B35' },
];

/** Corner radii per surface. The prototype's default is sharp (0) everywhere. */
export const RADII: Record<CornerStyle, { card: number; tile: number; button: number; chip: number }> = {
  sharp: { card: 0, tile: 0, button: 0, chip: 0 },
  rounded: { card: 18, tile: 14, button: 999, chip: 999 },
};

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}
export function isCornerStyle(value: unknown): value is CornerStyle {
  return value === 'sharp' || value === 'rounded';
}

/** Font family names registered by the app via @expo-google-fonts (see apps/mobile/src/app/_layout.tsx). */
export const FONTS = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;
