import { Check, X } from 'lucide-react';
import type { Step } from '@/lib/bookings';
import { cn } from '@/lib/cn';

/** Vertical numbered tracker (prototype Application Sent / Hire Request / Job Tracker). */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? <span className={cn('absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5', s.status === 'done' ? 'bg-accent' : 'bg-line')} aria-hidden /> : null}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                s.status === 'done' && 'bg-accent text-on-accent',
                s.status === 'active' && 'border-2 border-accent bg-accent-soft text-accent-ink',
                s.status === 'todo' && 'border-2 border-line-strong bg-surface text-muted',
                s.status === 'stopped' && 'border-2 border-danger bg-danger-soft text-danger',
              )}
            >
              {s.status === 'done' ? <Check className="size-4" strokeWidth={3} /> : s.status === 'stopped' ? <X className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="pt-1">
              <p className={cn('text-[15px] font-semibold', s.status === 'todo' ? 'text-muted' : s.status === 'stopped' ? 'text-danger' : 'text-ink')}>{s.title}</p>
              <p className="text-[13.5px] text-muted">{s.subtitle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
