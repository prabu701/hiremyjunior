'use client';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/Misc';
import { KIND_LABEL } from '@/lib/admin';
import { rpc } from '@/lib/rpc';

export default function AdminQueue() {
  const queue = useQuery({ queryKey: ['admin-queue'], queryFn: () => rpc('admin_verification_queue'), refetchInterval: 10_000 });
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="HireMyJunior ops" title="Review queue" subtitle="Manual checks, plus simulated vendor checks waiting for a result." />
      {queue.isLoading ? <Skeleton className="h-48" /> : null}
      {queue.data?.length === 0 ? <EmptyState icon={<Inbox className="size-6" />} title="All clear">Nothing is waiting for review.</EmptyState> : null}
      {queue.data?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          {queue.data.map((v) => (
            <li key={v.id}>
              <Link href={`/admin/review/${v.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2" data-testid={`queue-${v.kind}`}>
                <Avatar name={v.subject_name ?? v.subject_email} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{KIND_LABEL[v.kind] ?? v.kind}</p>
                  <p className="truncate text-[13px] text-muted">{v.subject_name ?? v.subject_email} · {v.subject_role} · {new Date(v.created_at).toLocaleString()}</p>
                </div>
                <Badge tone={v.provider.startsWith('mock') ? 'info' : 'warning'}>{v.provider.startsWith('mock') ? 'Simulated vendor' : 'Manual'}</Badge>
                <ChevronRight className="size-4.5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
