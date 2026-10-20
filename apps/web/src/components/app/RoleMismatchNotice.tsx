'use client';
import { isSelfServeRole, ROLE_COPY } from '@hmj/shared';
import { useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/lib/auth';

/** Shown on a role home when someone signed in through a different role than their account's. */
export function RoleMismatchNotice() {
  const requested = useSearchParams().get('requested');
  const { profile } = useAuth();
  if (!profile || !isSelfServeRole(requested) || !isSelfServeRole(profile.role) || requested === profile.role) return null;
  const actual = ROLE_COPY[profile.role].label;
  return (
    <Alert tone="info" title={`You're signed in as a ${actual}`}>
      This email is already registered as a {actual} account. Use a different email to create another kind of account.
    </Alert>
  );
}
