'use client';
import type { AppRole } from '@hmj/shared';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { homeHref } from '@/lib/routes';
import { AppShell } from './AppShell';

/** Wraps a role's area: signed out → sign-in, not onboarded → onboarding, wrong role → their home. */
export function RoleGate({ role, children }: { role: AppRole | 'any'; children: ReactNode }) {
  const { loading, session, profile } = useAuth();
  const router = useRouter();
  const wrong = !!profile && role !== 'any' && (profile.role !== role || (role !== 'admin' && !profile.onboarded_at));
  const needsOnboarding = !!profile && role === 'any' && profile.role !== 'admin' && !profile.onboarded_at;

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/sign-in');
    else if (profile && (wrong || needsOnboarding)) router.replace(homeHref(profile));
  }, [loading, session, profile, wrong, needsOnboarding, router]);

  if (loading || !profile || wrong || needsOnboarding) return <PageSpinner />;
  return <AppShell>{children}</AppShell>;
}
