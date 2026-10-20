'use client';
import { Briefcase, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const AUDIENCES = {
  teen: {
    label: 'Teens',
    Icon: UserRound,
    steps: [
      { t: 'Build your profile', d: 'Add your skills, rate and availability, then link your account to a parent or guardian.' },
      { t: 'Find jobs near you', d: 'Dog walking, tutoring, yard work, babysitting — posted by verified neighbors and local businesses.' },
      { t: 'Apply, get approved, get to work', d: 'Your parent approves each job. Once the employer confirms, you get the details and you’re on.' },
    ],
  },
  parent: {
    label: 'Parents',
    Icon: ShieldCheck,
    steps: [
      { t: 'Verify once', d: 'A quick ID check and selfie. Your verified identity is what vouches for your teen’s age.' },
      { t: 'Link your teen', d: 'Share an invite code. Two parents or split households? Each of you can link.' },
      { t: 'Approve every job', d: 'See who’s hiring, where and when — and approve or decline. Trust a family you know to skip the step next time.' },
    ],
  },
  employer: {
    label: 'Employers',
    Icon: Briefcase,
    steps: [
      { t: 'Get verified', d: 'Households pass an ID and background check. Businesses also confirm their WA minor work permit.' },
      { t: 'Post a job or invite a teen', d: 'Describe the work, set the rate and times. Or browse nearby teens and send a hire request.' },
      { t: 'Confirm and connect', d: 'Once a parent approves, confirm the teen — the address and contact details are shared then, not before.' },
    ],
  },
} as const;

type Key = keyof typeof AUDIENCES;

export function HowItWorks() {
  const [tab, setTab] = useState<Key>('teen');
  const a = AUDIENCES[tab];
  return (
    <div>
      <div role="tablist" aria-label="Who is it for" className="mx-auto flex w-fit gap-1 rounded-pill border border-line bg-surface p-1 shadow-soft">
        {(Object.keys(AUDIENCES) as Key[]).map((k) => {
          const { label, Icon } = AUDIENCES[k];
          return (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn('flex items-center gap-2 rounded-pill px-4 py-2 text-[14px] font-semibold transition-all sm:px-5', tab === k ? 'bg-ink text-canvas shadow-soft' : 'text-muted hover:text-ink')}
            >
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>
      <ol key={tab} className="mt-12 grid gap-5 md:grid-cols-3" role="tabpanel">
        {a.steps.map((s, i) => (
          <li key={s.t} className="relative animate-rise rounded-card border border-line bg-surface p-7 shadow-soft" style={{ animationDelay: `${i * 90}ms` }}>
            <span className="font-display text-5xl font-semibold text-accent/25">0{i + 1}</span>
            <h3 className="mt-3 text-xl text-ink">{s.t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
