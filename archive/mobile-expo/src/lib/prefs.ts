import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CORNERS, DEFAULT_THEME, isCornerStyle, isThemeKey, type CornerStyle, type ThemeKey } from '@hmj/ui';

// Appearance is chosen before sign-in too, so it lives on the device first and is
// mirrored to profiles.theme / profiles.corner_style once signed in.
const KEY = 'hmj.appearance.v1';

export interface Appearance {
  theme: ThemeKey;
  corners: CornerStyle;
}

export async function loadAppearance(): Promise<Appearance> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>) : {};
    return {
      theme: isThemeKey(parsed.theme) ? parsed.theme : DEFAULT_THEME,
      corners: isCornerStyle(parsed.corners) ? parsed.corners : DEFAULT_CORNERS,
    };
  } catch {
    return { theme: DEFAULT_THEME, corners: DEFAULT_CORNERS };
  }
}

export async function saveAppearance(value: Appearance): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private browsing); appearance just won't persist.
  }
}
