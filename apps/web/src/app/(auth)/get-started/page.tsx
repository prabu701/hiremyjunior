import { ArrowRight, Briefcase, ShieldCheck, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Get started' };

const ROLES = [
  { role: 'junior', Icon: UserRound, tone: 'bg-tint-1 text-tint-1-ink', title: "I'm a teen", body: 'Find paid jobs near you. Ages 14–17.' },
  { role: 'parent', Icon: ShieldCheck, tone: 'bg-tint-2 text-tint-2-ink', title: "I'm a parent", body: 'Link your teen and approve their jobs.' },
  { role: 'employer', Icon: Briefcase, tone: 'bg-tint-3 text-tint-3-ink', title: "I'm hiring", body: 'For households and Washington businesses.' },
] as const;

export default function GetStarted() {
  return (
    <div className="animate-rise">
      <h1 className="text-[34px] leading-tight text-ink">Who’s signing up?</h1>
      <p className="mt-2 text-[15.5px] text-muted">Real jobs for teens, with parents and employers verified every step of the way.</p>
      <div className="mt-8 space-y-3">
        {ROLES.map(({ role, Icon, tone, title, body }) => (
          <Link
            key={role}
            href={`/sign-in?role=${role}`}
            data-testid={`role-${role}`}
            className="group flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
          >
            <span className={`flex size-13 items-center justify-center rounded-tile ${tone}`}><Icon className="size-6" /></span>
            <span className="flex-1">
              <span className="block font-display text-[18px] font-semibold text-ink">{title}</span>
              <span className="block text-[14px] text-muted">{body}</span>
            </span>
            <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-[14px] text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-accent-ink hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
