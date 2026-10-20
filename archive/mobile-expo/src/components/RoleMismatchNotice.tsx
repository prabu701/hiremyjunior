import { ROLE_COPY, isSelfServeRole } from '@hmj/shared';
import { Notice } from '@hmj/ui';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';

/** Shown on a role home when someone signed in through a different role card than their account's. */
export function RoleMismatchNotice() {
  const { requested } = useLocalSearchParams<{ requested?: string }>();
  const { profile } = useAuth();
  if (!profile || !isSelfServeRole(requested) || !isSelfServeRole(profile.role) || requested === profile.role) return null;
  const actual = ROLE_COPY[profile.role].label;
  return (
    <Notice tone={2}>{`This email is already registered as a ${actual} account, so we signed you in as a ${actual}. Use a different email to create another kind of account.`}</Notice>
  );
}
