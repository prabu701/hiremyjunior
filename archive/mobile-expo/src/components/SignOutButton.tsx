import { Button } from '@hmj/ui';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';

export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Button
      testID="sign-out"
      label="Sign out"
      variant="secondary"
      onPress={async () => {
        await signOut();
        router.replace('/welcome');
      }}
    />
  );
}
