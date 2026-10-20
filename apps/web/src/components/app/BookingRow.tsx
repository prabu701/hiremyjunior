import type { BookingState } from '@hmj/booking';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Monogram, toneFor } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { stateLabel, stateTone } from '@/lib/bookings';
import { cn } from '@/lib/cn';
import { dayLabel, rate } from '@/lib/format';

const TONE = { 1: 'neutral', 2: 'info', 3: 'success' } as const;

export function BookingRow({ b, title, subtitle, href }: {
  b: { id: string; state: BookingState; job_title: string; rate_cents: number; pay_type: 'hourly' | 'fixed'; next_shift_at: string | null; needs_action: boolean };
  title?: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      data-testid={`booking-${b.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-card border bg-surface p-4 transition-all hover:shadow-lift',
        b.needs_action ? 'border-accent/60 shadow-[0_0_0_3px_var(--accent-soft)]' : 'border-line shadow-soft hover:border-line-strong',
      )}
    >
      <Monogram label={b.job_title} tone={toneFor(b.id)} size={46} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{title ?? b.job_title}</p>
        <p className="truncate text-[13px] text-muted">{subtitle}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-display text-[15px] font-semibold text-accent">{rate(b.rate_cents, b.pay_type)}</p>
        {b.next_shift_at ? <p className="text-[12.5px] text-muted">{dayLabel(b.next_shift_at)}</p> : null}
      </div>
      <Badge tone={b.needs_action ? 'accent' : TONE[stateTone(b.state)]}>{b.needs_action ? 'Your move' : stateLabel(b.state)}</Badge>
      <ChevronRight className="hidden size-4.5 text-muted sm:block" />
    </Link>
  );
}
