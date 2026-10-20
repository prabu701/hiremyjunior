'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { applyAppearance, isCornerStyle, isThemeKey } from '@/lib/theme';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AccountSync client={client} />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * On sign-in, the profile's saved appearance wins (so it follows the person across devices);
 * cached data from a previous account is dropped when the signed-in user changes.
 */
function AccountSync({ client }: { client: QueryClient }) {
  const { session, profile } = useAuth();
  const lastUser = useRef<string | undefined>(undefined);
  const adoptedFor = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user.id;
    if (lastUser.current !== undefined && lastUser.current !== uid) client.clear();
    lastUser.current = uid;
  }, [session?.user.id, client]);

  useEffect(() => {
    if (!profile || adoptedFor.current === profile.id) return;
    adoptedFor.current = profile.id;
    if (isThemeKey(profile.theme) && isCornerStyle(profile.corner_style)) applyAppearance(profile.theme, profile.corner_style);
  }, [profile]);

  return null;
}
