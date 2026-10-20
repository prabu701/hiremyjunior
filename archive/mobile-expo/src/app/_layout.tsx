import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider, THEMES, useTheme, type CornerStyle, type ThemeKey } from '@hmj/ui';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { loadAppearance, saveAppearance, type Appearance } from '@/lib/prefs';
import { queryClient } from '@/lib/queries';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [appearance, setAppearance] = useState<Appearance | null>(null);

  useEffect(() => {
    loadAppearance().then(setAppearance);
  }, []);

  const ready = (fontsLoaded || fontError) && appearance;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const setTheme = useCallback((theme: ThemeKey) => {
    setAppearance((prev) => {
      const next = { corners: prev?.corners ?? 'sharp', theme };
      saveAppearance(next);
      return next;
    });
  }, []);
  const setCorners = useCallback((corners: CornerStyle) => {
    setAppearance((prev) => {
      const next = { theme: prev?.theme ?? 'midnight', corners };
      saveAppearance(next);
      return next;
    });
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider themeKey={appearance.theme} corners={appearance.corners} onThemeChange={setTheme} onCornersChange={setCorners}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppearanceSync />
            <ThemedStack />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Keeps the device's appearance and the signed-in profile in step: on sign-in the profile's saved
 * choice wins (so it follows the user across devices); after that, local changes are written back.
 */
function AppearanceSync() {
  const { profile, updateProfile, session } = useAuth();
  const { themeKey, corners, setTheme, setCorners } = useTheme();
  const adoptedFor = useRef<string | null>(null);

  // Drop cached data from the previous account when the signed-in user changes.
  const lastUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uid = session?.user.id;
    if (lastUser.current !== undefined && lastUser.current !== uid) queryClient.clear();
    lastUser.current = uid;
  }, [session?.user.id]);

  useEffect(() => {
    if (!profile) {
      adoptedFor.current = null;
      return;
    }
    if (adoptedFor.current !== profile.id) {
      adoptedFor.current = profile.id;
      if (profile.theme !== themeKey) setTheme(profile.theme);
      if (profile.corner_style !== corners) setCorners(profile.corner_style);
      return;
    }
    if (profile.theme !== themeKey || profile.corner_style !== corners) {
      updateProfile({ theme: themeKey, corner_style: corners }).catch(() => {
        // Non-critical: the device keeps the choice; it syncs on the next change.
      });
    }
  }, [profile, themeKey, corners, setTheme, setCorners, updateProfile]);

  return null;
}

function ThemedStack() {
  const { t, themeKey } = useTheme();
  return (
    <>
      <StatusBar style={THEMES[themeKey].dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </>
  );
}
