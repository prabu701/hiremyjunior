'use client';
import { useAuth } from '@/lib/auth';

function partOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Greeting({ subtitle }: { subtitle?: string }) {
  const { profile } = useAuth();
  const first = profile?.full_name?.split(' ')[0] ?? 'there';
  return (
    <div>
      <p className="text-[14px] font-semibold text-muted" suppressHydrationWarning>{subtitle ?? partOfDay()}</p>
      <h1 className="text-[30px] leading-tight text-ink sm:text-[36px]" data-testid="greeting">Hey, {first}</h1>
    </div>
  );
}
