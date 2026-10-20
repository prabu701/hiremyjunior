import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'safety';

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: 'bg-tint-2 text-tint-2-ink', Icon: Info },
  success: { box: 'bg-tint-3 text-tint-3-ink', Icon: CheckCircle2 },
  warning: { box: 'bg-tint-1 text-tint-1-ink', Icon: Info },
  danger: { box: 'bg-danger-soft text-danger', Icon: AlertTriangle },
  safety: { box: 'bg-tint-2 text-tint-2-ink', Icon: ShieldCheck },
};

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('flex gap-3 rounded-card p-4 text-[13.5px] leading-relaxed', box, className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
