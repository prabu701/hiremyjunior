// Appearance: the prototype's four themes and two corner styles.
export const THEMES = [
  { key: 'citrus', name: 'Citrus', desc: 'Warm cream & tangerine', bg: '#FDF6EC', accent: '#FF6B35' },
  { key: 'electric', name: 'Electric Violet', desc: 'Cool lavender & violet', bg: '#F6F3FF', accent: '#7C5CFC' },
  { key: 'sunset', name: 'Sunset Coral', desc: 'Soft blush & hot coral', bg: '#FFF3F0', accent: '#FF4F81' },
  { key: 'midnight', name: 'Midnight', desc: 'Dark mode, tangerine pop', bg: '#17171F', accent: '#FF6B35' },
] as const;

export type ThemeKey = (typeof THEMES)[number]['key'];
export type CornerStyle = 'sharp' | 'rounded';

export const DEFAULT_THEME: ThemeKey = 'citrus';
export const DEFAULT_CORNERS: CornerStyle = 'rounded';
export const THEME_COOKIE = 'hmj-theme';
export const CORNERS_COOKIE = 'hmj-corners';

export const isThemeKey = (v: unknown): v is ThemeKey => THEMES.some((t) => t.key === v);
export const isCornerStyle = (v: unknown): v is CornerStyle => v === 'sharp' || v === 'rounded';

/** Apply on the client and remember in a cookie so the server renders the right theme next time. */
export function applyAppearance(theme: ThemeKey, corners: CornerStyle) {
  const el = document.documentElement;
  el.dataset.theme = theme;
  el.dataset.corners = corners;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `${CORNERS_COOKIE}=${corners}; path=/; max-age=${maxAge}; samesite=lax`;
}
