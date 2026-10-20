import { BadgeCheck, Check, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';

/**
 * Hero visual: real UI pieces from the product (job card, parent approval, booking tracker),
 * layered with depth. Pure HTML/CSS so it follows the active theme.
 */
export function ProductPreview() {
  return (
    <div className="relative mx-auto aspect-[5/5.2] w-full max-w-[520px]" aria-hidden>
      {/* glow */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)] opacity-80 blur-2xl" />

      {/* job card */}
      <div className="absolute left-[6%] right-[10%] top-[6%] animate-rise rounded-card border border-line bg-surface p-5 shadow-float [animation-delay:80ms]">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-tile bg-tint-3 font-display text-xl font-semibold text-tint-3-ink">W</div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] font-semibold text-ink">Weekend Dog Walking</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="size-3.5" /> 0.4 mi · Sammamish
            </p>
          </div>
          <p className="font-display text-lg font-semibold text-accent">$18/hr</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-semibold text-tint-2-ink">
            <ShieldCheck className="size-3.5" /> Background-checked
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-muted">
            <Clock className="size-3.5" /> Sat & Sun, 9–11 AM
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-tile bg-surface-2 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-tint-1 text-[12px] font-bold text-tint-1-ink">C</div>
            <div>
              <p className="text-[13px] font-semibold text-ink">The Chen Family</p>
              <p className="flex items-center gap-1 text-[11.5px] text-muted"><Star className="size-3 fill-current text-accent" /> Verified household</p>
            </div>
          </div>
          <span className="rounded-control bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-on-accent">Apply</span>
        </div>
      </div>

      {/* parent approval */}
      <div className="absolute bottom-[8%] left-0 w-[64%] animate-rise rounded-card border border-line bg-surface p-4 shadow-float [animation-delay:260ms]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent-ink">Approval needed</p>
        <p className="mt-1 font-display text-[15px] font-semibold leading-snug text-ink">Maya wants to work “Weekend Dog Walking”</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-control border border-line-strong py-2 text-center text-[12.5px] font-semibold text-ink">Decline</span>
          <span className="rounded-control bg-accent py-2 text-center text-[12.5px] font-semibold text-on-accent">Approve</span>
        </div>
      </div>

      {/* tracker */}
      <div className="absolute bottom-[2%] right-0 w-[44%] animate-rise rounded-card border border-line bg-surface p-4 shadow-float [animation-delay:420ms]">
        {[
          { t: 'Application sent', done: true },
          { t: 'Parent approved', done: true },
          { t: 'Employer confirms', done: false },
        ].map((s, i) => (
          <div key={s.t} className="flex items-center gap-2.5 py-1">
            <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? 'bg-accent text-on-accent' : 'border-2 border-accent text-accent'}`}>
              {s.done ? <Check className="size-3" strokeWidth={3.5} /> : i + 1}
            </span>
            <span className={`text-[12px] font-semibold ${s.done ? 'text-ink' : 'text-muted'}`}>{s.t}</span>
          </div>
        ))}
      </div>

      {/* verified pill */}
      <div className="absolute right-[2%] top-[0%] animate-float rounded-full border border-line bg-surface px-3.5 py-2 shadow-lift">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <BadgeCheck className="size-4 text-tint-3-ink" /> Parent ID verified
        </span>
      </div>
    </div>
  );
}
