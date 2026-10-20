import type { Profile } from '@hmj/shared';
import type { Href } from 'expo-router';

/** Where a signed-in person lands. */
export function homeHref(profile: Pick<Profile, 'role' | 'onboarded_at'>): Href {
  if (profile.role === 'admin') return '/admin';
  if (!profile.onboarded_at) return '/onboarding';
  if (profile.role === 'junior') return '/teen';
  if (profile.role === 'parent') return '/parent';
  return '/employer';
}
