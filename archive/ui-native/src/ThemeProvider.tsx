import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_CORNERS, DEFAULT_THEME, RADII, THEMES, type CornerStyle, type Theme, type ThemeKey } from './themes';

interface ThemeContextValue {
  t: Theme;
  themeKey: ThemeKey;
  corners: CornerStyle;
  radius: (typeof RADII)[CornerStyle];
  setTheme: (key: ThemeKey) => void;
  setCorners: (style: CornerStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Controlled: the app owns persistence (local storage + profile) and passes the values in. */
export function ThemeProvider({
  themeKey = DEFAULT_THEME,
  corners = DEFAULT_CORNERS,
  onThemeChange,
  onCornersChange,
  children,
}: {
  themeKey?: ThemeKey;
  corners?: CornerStyle;
  onThemeChange: (key: ThemeKey) => void;
  onCornersChange: (style: CornerStyle) => void;
  children: ReactNode;
}) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      t: THEMES[themeKey],
      themeKey,
      corners,
      radius: RADII[corners],
      setTheme: onThemeChange,
      setCorners: onCornersChange,
    }),
    [themeKey, corners, onThemeChange, onCornersChange],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
