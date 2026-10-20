import { BadgeCheck, Check, MapPinOff, ShieldCheck, UserCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';

const POINTS = [
  { Icon: BadgeCheck, t: 'Parents verify their identity once', tone: 'bg-tint-1 text-tint-1-ink' },
  { Icon: ShieldCheck, t: 'Every employer is background-checked', tone: 'bg-tint-2 text-tint-2-ink' },
  { Icon: UserCheck, t: 'A parent approves every single job', tone: 'bg-tint-3 text-tint-3-ink' },
  { Icon: MapPinOff, t: 'Addresses shared only after confirmation', tone: 'bg-tint-1 text-tint-1-ink' },
];

// What a new account sees first — the same checklist card the dashboard shows.
const PREVIEW = [
  { t: 'Complete your profile', done: true },
  { t: 'Verify your phone number', done: true },
  { t: 'Link to a verified parent', done: false },
];

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(440px,0.85fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-center text-[12.5px] text-muted">Piloting in Washington State · For teens aged 14–17 and their families</p>
      </div>

      {/* Same surface as the app sidebar, so signing in feels like stepping into the product. */}
      <aside className="relative hidden overflow-hidden border-l border-line bg-nav p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)] opacity-80 blur-2xl" />
        <div className="relative mx-auto w-full max-w-md">
          <p className="font-display text-[36px] font-semibold leading-[1.12] text-ink">
            First jobs,
            <br />
            <span className="text-accent">with the grown-ups on board.</span>
          </p>

          <div className="mt-9 rounded-card border border-line bg-surface p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <p className="font-display text-[16px] font-semibold text-ink">Before you can apply</p>
              <span className="rounded-pill bg-tint-1 px-2.5 py-1 text-[11.5px] font-semibold text-tint-1-ink">1 to go</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full w-2/3 rounded-full bg-accent" /></div>
            <ul className="mt-3 divide-y divide-line">
              {PREVIEW.map((r, i) => (
                <li key={r.t} className="flex items-center gap-3 py-2.5">
                  <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${r.done ? 'bg-accent text-on-accent' : 'border-2 border-line-strong text-muted'}`}>
                    {r.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[14px] font-semibold ${r.done ? 'text-muted line-through decoration-line-strong' : 'text-ink'}`}>{r.t}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-8 space-y-3.5">
            {POINTS.map(({ Icon, t, tone }) => (
              <li key={t} className="flex items-center gap-3 text-[15px] text-ink">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-tile ${tone}`}><Icon className="size-4.5" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
