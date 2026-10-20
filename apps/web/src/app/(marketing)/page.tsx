import {
  ArrowRight, Baby, BadgeCheck, Briefcase, Building2, CheckCircle2, ChevronDown, Eye, GraduationCap, Home, IceCreamCone,
  KeyRound, Laptop, Leaf, MapPinOff, MessageSquareLock, Package, PawPrint, ShieldCheck, ShoppingBag, Snowflake, Sparkles,
  Store, Tent, UserCheck, UserRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = { title: { absolute: 'HireMyJunior — Real jobs for teens, with parents in the loop' } };

const TRUST = [
  { Icon: BadgeCheck, t: 'ID-verified parents', d: 'Every teen is linked to a verified parent or guardian.' },
  { Icon: ShieldCheck, t: 'Background-checked employers', d: 'Checked before they can post a single job.' },
  { Icon: UserCheck, t: 'Parents approve every job', d: 'Nothing happens without a guardian’s yes.' },
  { Icon: MapPinOff, t: 'Addresses stay private', d: 'Shared only once a job is confirmed.' },
];

const CATEGORIES = [
  { Icon: Leaf, name: 'Yard work' }, { Icon: PawPrint, name: 'Pet care' }, { Icon: Baby, name: 'Babysitting' },
  { Icon: GraduationCap, name: 'Tutoring' }, { Icon: Sparkles, name: 'Cleaning' }, { Icon: Package, name: 'Moving help' },
  { Icon: Laptop, name: 'Tech help' }, { Icon: ShoppingBag, name: 'Errands' }, { Icon: Snowflake, name: 'Snow shoveling' },
  { Icon: Store, name: 'Retail' }, { Icon: IceCreamCone, name: 'Food service' }, { Icon: Tent, name: 'Camp & rec' },
];

const SAFETY = [
  { Icon: KeyRound, t: 'Verified on every side', d: 'Parents verify with government ID and a selfie. Household employers pass a background check; businesses also confirm their Washington minor work permit endorsement and check their on-site supervisor.' },
  { Icon: UserCheck, t: 'A parent’s yes, every time', d: 'Teens can’t take a job alone. A linked guardian reviews the employer, the pay, the time and the place — and can cancel any time before work starts.' },
  { Icon: MapPinOff, t: 'Location stays approximate', d: 'Search shows a rough distance and the neighborhood. The street address appears only after the parent approves and the employer confirms.' },
  { Icon: MessageSquareLock, t: 'Contact details protected', d: 'Phone numbers and emails in notes are hidden until a job is confirmed, so everything starts inside HireMyJunior.' },
  { Icon: Eye, t: 'Parents see everything', d: 'Every request, every decision and every change is recorded and visible to the teen’s guardians.' },
  { Icon: ShieldCheck, t: 'Age rules built in', d: 'Teens only see jobs they’re old enough for, and hazardous work can’t be posted at all.' },
];

const FAQ = [
  { q: 'Who can join?', a: 'Teens aged 14–17 who live in Washington State, together with a parent or legal guardian. Employers can be households (neighbors hiring for help at home) or registered Washington businesses.' },
  { q: 'Does my parent need an account?', a: 'Yes. A parent or guardian verifies their identity, confirms your date of birth and approves each job. That’s what makes HireMyJunior safe for everyone.' },
  { q: 'How are employers checked?', a: 'Every employer verifies their identity. Households pass a background check before posting. Businesses also prove their Washington registration and their Minor Work Permit Endorsement, and their on-site supervisor is background-checked.' },
  { q: 'How does pay work?', a: 'For household jobs, payment runs through HireMyJunior to the parent’s account, so teens never handle payment details. For business jobs, HireMyJunior makes the introduction and the business hires and pays the teen directly, like any employer.' },
  { q: 'What about work-hour rules?', a: 'Washington limits when and how long teens can work for businesses. Business employers are responsible for those rules and the required Parent/School Authorization — HireMyJunior shows both sides the checklist when the introduction is made.' },
  { q: 'Where is HireMyJunior available?', a: 'We’re piloting in Washington State, starting on the Eastside around Sammamish, Issaquah and Redmond.' },
];

export default function Landing() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink shadow-soft">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-accent" /></span>
              Now piloting in Washington State
            </span>
            <h1 className="mt-6 text-[44px] leading-[1.04] tracking-tight text-ink sm:text-[58px] lg:text-[66px]">
              Real jobs for teens.
              <br />
              <span className="text-accent">Parents in the loop.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted">
              HireMyJunior connects 14–17 year olds with paid work from verified neighbors and local businesses — and a parent approves every job.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/sign-in?role=junior" size="lg" iconRight={<ArrowRight className="size-4" />}>Find a job</ButtonLink>
              <ButtonLink href="/sign-in?role=employer" size="lg" variant="secondary">Hire a teen</ButtonLink>
            </div>
            <p className="mt-5 text-[14px] text-muted">
              Parent?{' '}
              <Link href="/sign-in?role=parent" className="font-semibold text-accent-ink underline-offset-4 hover:underline">Set up your family account →</Link>
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {TRUST.map(({ Icon, t, d }) => (
            <div key={t} className="flex gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-accent-soft text-accent-ink"><Icon className="size-5" /></div>
              <div>
                <p className="text-[15px] font-semibold text-ink">{t}</p>
                <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">How it works</p>
            <h2 className="mt-3 text-[36px] leading-tight text-ink sm:text-[44px]">Three people, one simple handshake</h2>
            <p className="mt-4 text-[17px] text-muted">Every job has a teen, a parent and an employer — and each gets exactly the view and the say they need.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">The work</p>
              <h2 className="mt-3 text-[32px] leading-tight text-ink sm:text-[40px]">First jobs, done right</h2>
            </div>
            <p className="max-w-md text-[15px] text-muted">From weekend dog walking to a first shift at a local shop. Teens only see what they’re old enough to do.</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map(({ Icon, name }, i) => (
              <div key={name} className="group flex flex-col items-start gap-6 rounded-card border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className={`flex size-11 items-center justify-center rounded-tile ${['bg-tint-1 text-tint-1-ink', 'bg-tint-2 text-tint-2-ink', 'bg-tint-3 text-tint-3-ink'][i % 3]}`}>
                  <Icon className="size-5" />
                </div>
                <p className="font-display text-[16px] font-semibold text-ink">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety ───────────────────────────────────────────────────────── */}
      <section id="safety" className="scroll-mt-20 border-y border-line bg-nav py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">Safety first</p>
              <h2 className="mt-3 text-[36px] leading-tight text-ink sm:text-[44px]">Built around the fact that every worker is a minor</h2>
            </div>
            <p className="text-[17px] leading-relaxed text-muted">Identity, consent and privacy aren’t features we added later. They’re how every job works, from the first search to the first shift.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map(({ Icon, t, d }, i) => (
              <div key={t} className="rounded-card border border-line bg-surface p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className={`flex size-11 items-center justify-center rounded-tile ${['bg-tint-1 text-tint-1-ink', 'bg-tint-2 text-tint-2-ink', 'bg-tint-3 text-tint-3-ink'][i % 3]}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-[19px] text-ink">{t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Employers ────────────────────────────────────────────────────── */}
      <section id="employers" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">For employers</p>
            <h2 className="mt-3 text-[36px] leading-tight text-ink sm:text-[44px]">Two ways to hire, both done properly</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[
              {
                Icon: Home, tone: 'bg-tint-1 text-tint-1-ink', tag: 'Households',
                h: 'Help around the home',
                d: 'Neighbors hiring for yard work, pet care, babysitting, tutoring and errands. Post a job, approve a teen, and pay through HireMyJunior.',
                points: ['ID verification and a background check', 'Post jobs or invite teens directly', 'Payment handled through HireMyJunior'],
              },
              {
                Icon: Building2, tone: 'bg-tint-2 text-tint-2-ink', tag: 'Businesses',
                h: 'A teen’s first real job',
                d: 'Registered Washington businesses hiring for retail, food service, office and camp roles. We make the introduction; you hire and pay directly.',
                points: ['WA registration and minor work permit verified', 'On-site supervisor background-checked', 'Compliance checklist at every introduction'],
              },
            ].map(({ Icon, tone, tag, h, d, points }) => (
              <div key={tag} className="flex flex-col rounded-card border border-line bg-surface p-8 shadow-soft sm:p-10">
                <div className="flex items-center gap-3">
                  <div className={`flex size-11 items-center justify-center rounded-tile ${tone}`}><Icon className="size-5" /></div>
                  <span className="text-[13px] font-bold uppercase tracking-wider text-muted">{tag}</span>
                </div>
                <h3 className="mt-6 text-[26px] text-ink">{h}</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{d}</p>
                <ul className="mt-6 space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink">
                      <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-accent" /> {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-2">
                  <ButtonLink href="/sign-in?role=employer" variant="secondary" iconRight={<ArrowRight className="size-4" />}>Start hiring</ButtonLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 pb-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">FAQ</p>
            <h2 className="mt-3 text-[36px] leading-tight text-ink">Questions families ask</h2>
            <p className="mt-4 text-[16px] text-muted">Anything else? We’re a small team piloting in Washington — we read every message.</p>
          </div>
          <div className="divide-y divide-line rounded-card border border-line bg-surface">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-ink">
                  {q}
                  <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-card border border-line bg-surface px-6 py-14 text-center shadow-soft sm:py-16">
          <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[70%] rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)] opacity-70 blur-2xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[34px] leading-tight text-ink sm:text-[44px]">Ready for a first job that feels right?</h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] text-muted">Create a free account in a couple of minutes. Pick who you are and we’ll walk you through the rest.</p>
            <div className="mx-auto mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                { href: '/sign-in?role=junior', Icon: UserRound, l: 'I’m a teen', d: 'Find jobs near you', tone: 'bg-tint-1 text-tint-1-ink' },
                { href: '/sign-in?role=parent', Icon: ShieldCheck, l: 'I’m a parent', d: 'Approve and track jobs', tone: 'bg-tint-2 text-tint-2-ink' },
                { href: '/sign-in?role=employer', Icon: Briefcase, l: 'I’m hiring', d: 'Post jobs, hire teens', tone: 'bg-tint-3 text-tint-3-ink' },
              ].map(({ href, Icon, l, d, tone }) => (
                <Link key={href} href={href} className="group flex items-center gap-3.5 rounded-card border border-line bg-canvas p-4 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-tile ${tone}`}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[16px] font-semibold text-ink">{l}</span>
                    <span className="block text-[13px] text-muted">{d}</span>
                  </span>
                  <ArrowRight className="size-4.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
