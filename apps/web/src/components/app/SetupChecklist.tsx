'use client';
import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { useRequirements } from '@/lib/queries';

// Where each requirement (from public.requirements_for) is completed.
const ACTIONS: Record<string, string> = {
  profile: '/onboarding',
  guardian: '/teen/link-parent',
  teen: '/parent/teens/invite',
  phone: '/settings/phone',
  identity: '/settings/identity',
  proof_of_age: '/teen/proof-of-age',
  background_check: '/employer/verification',
  supervisor_check: '/employer/verification',
  business_registration: '/employer/verification',
  work_permit: '/employer/verification',
};

/** "Finish setting up" card; hidden once everything is done (unless `always`). */
export function SetupChecklist({ title = 'Finish setting up', subtitle, always = false }: { title?: string; subtitle?: string; always?: boolean }) {
  const { data, isLoading } = useRequirements();
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data || (!always && data.every((r) => r.done))) return null;
  const done = data.filter((r) => r.done).length;
  const blockingLeft = data.filter((r) => r.blocking && !r.done).length;
  const pct = Math.round((done / data.length) * 100);

  return (
    <Card className="overflow-hidden" data-testid="setup-checklist">
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg text-ink">{title}</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">{subtitle ?? `${done} of ${data.length} complete`}</p>
        </div>
        {blockingLeft ? <Badge tone="warning">{blockingLeft} to go</Badge> : <Badge tone="success">Ready</Badge>}
      </div>
      <div className="mx-5 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:mx-6">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {data.map((r, i) => {
          const href = ACTIONS[r.key];
          const row = (
            <>
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold', r.done ? 'bg-accent text-on-accent' : 'border-2 border-line-strong text-muted')}>
                {r.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[14.5px] font-semibold', r.done ? 'text-muted line-through decoration-line-strong' : 'text-ink')}>{r.label}</span>
                {!r.done && (r.hint || !r.blocking) ? <span className="block text-[13px] text-muted">{r.hint ?? 'Optional for now'}</span> : null}
              </span>
              {!r.done && href ? <ChevronRight className="size-4.5 text-muted transition-transform group-hover:translate-x-0.5" /> : null}
            </>
          );
          return (
            <li key={r.key}>
              {!r.done && href ? (
                <Link href={href} data-testid={`req-${r.key}`} className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:px-6">{row}</Link>
              ) : (
                <div className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
