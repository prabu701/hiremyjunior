'use client';
import type { Profile, ProfileUpdate } from '@hmj/shared';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase/client';

interface AuthState {
  /** true until the session (and its profile, if any) has been read. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<{ uid: string; message: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data, error }) => {
      if (cancelled) return;
      setProfile(data ?? null);
      setProfileError(error ? { uid: userId, message: error.message } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    setProfileError(error ? { uid: userId, message: error.message } : null);
  }, [supabase, userId]);

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!userId) return;
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
      if (error) throw new Error(error.message);
      setProfile(data);
    },
    [supabase, userId],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  // Derived, so a fresh session never renders without its profile and a previous user's
  // profile is never exposed after the session changes.
  const currentProfile = userId && profile?.id === userId ? profile : null;
  const currentError = userId && profileError?.uid === userId ? profileError.message : null;
  const settled = !userId || currentProfile !== null || currentError !== null;

  const value = useMemo<AuthState>(
    () => ({ loading: !sessionReady || !settled, session, profile: currentProfile, profileError: currentError, updateProfile, refreshProfile, signOut }),
    [sessionReady, settled, session, currentProfile, currentError, updateProfile, refreshProfile, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
