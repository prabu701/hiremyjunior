import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { MarketingNav } from '@/components/marketing/MarketingNav';

export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <MarketingNav />
      <main>{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-muted">
              Real jobs for teens, with parents and employers verified every step of the way. Piloting in Washington State.
            </p>
          </div>
          {[
            { h: 'Product', l: [['How it works', '/#how-it-works'], ['Safety', '/#safety'], ['For employers', '/#employers'], ['FAQ', '/#faq']] },
            { h: 'Get started', l: [['I’m a teen', '/sign-in?role=junior'], ['I’m a parent', '/sign-in?role=parent'], ['I’m hiring', '/sign-in?role=employer']] },
            { h: 'Account', l: [['Sign in', '/sign-in'], ['Create account', '/get-started']] },
          ].map((col) => (
            <div key={col.h}>
              <p className="text-[13px] font-bold uppercase tracking-wider text-ink">{col.h}</p>
              <ul className="mt-4 space-y-2.5">
                {col.l.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href!} className="text-[14px] text-muted transition-colors hover:text-ink">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-7xl px-5 py-6 text-[13px] text-muted sm:px-8">© {new Date().getFullYear()} HireMyJunior. Built for families in Washington State.</p>
        </div>
      </footer>
    </>
  );
}
