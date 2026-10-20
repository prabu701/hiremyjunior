import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmailSignInForm } from './EmailSignInForm';

export const metadata: Metadata = { title: 'Sign in with email' };

export default function EmailSignInPage() {
  return (
    <Suspense>
      <EmailSignInForm />
    </Suspense>
  );
}
