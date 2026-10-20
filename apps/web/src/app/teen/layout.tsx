import { Suspense } from 'react';
import { RoleGate } from '@/components/app/RoleGate';
import { PageSpinner } from '@/components/ui/Spinner';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="junior"><Suspense fallback={<PageSpinner />}>{children}</Suspense></RoleGate>;
}
