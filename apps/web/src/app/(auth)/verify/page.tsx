import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyForm } from './VerifyForm';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
