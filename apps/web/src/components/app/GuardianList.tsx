'use client';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useGuardianships } from '@/lib/queries';

/** Linked parents (teen view) or linked teens (parent view). */
export function GuardianList({ empty }: { empty: React.ReactNode }) {
  const { profile } = useAuth();
  const { data } = useGuardianships();
  const asParent = profile?.role === 'parent';
  if (!data?.length) return <>{empty}</>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.map((g) => {
        const other = asParent ? g.junior : g.parent;
        const pending = g.status === 'pending';
        const body = (
          <>
            <Avatar name={other?.full_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{other?.full_name ?? other?.email}</p>
              <p className="text-[13px] text-muted">{pending ? (asParent ? 'Wants to link — confirm to finish' : 'Waiting for them to confirm') : asParent ? 'Linked teen' : 'Parent / guardian'}</p>
            </div>
            <Badge tone={pending ? 'warning' : 'success'}>{pending ? 'Pending' : 'Linked'}</Badge>
          </>
        );
        const cls = 'flex items-center gap-3.5 rounded-card border border-line bg-surface p-4 shadow-soft';
        return (
          <li key={g.id}>
            {asParent ? (
              <Link href={`/parent/teens/${g.id}`} data-testid={`guardianship-${g.id}`} className={`${cls} transition-all hover:-translate-y-0.5 hover:shadow-lift`}>{body}</Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
