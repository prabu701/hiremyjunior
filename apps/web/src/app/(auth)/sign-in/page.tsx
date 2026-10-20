import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { INVITE_COOKIE } from '@/lib/invite';
import { PhoneSignIn } from './PhoneSignIn';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
  // Read on the server so the "your parent invited you" state renders correctly on first paint.
  const invited = /^[A-Z0-9]{8}$/.test((await cookies()).get(INVITE_COOKIE)?.value ?? '');
  return (
    <Suspense>
      <PhoneSignIn invited={invited} />
    </Suspense>
  );
}
