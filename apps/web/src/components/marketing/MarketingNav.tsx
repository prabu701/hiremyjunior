'use client';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#safety', label: 'Safety' },
  { href: '/#employers', label: 'For employers' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingNav() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('sticky top-0 z-50 transition-all', scrolled ? 'border-b border-line bg-canvas/85 backdrop-blur-xl' : 'border-b border-transparent')}>
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <ButtonLink href="/home" size="sm">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/sign-in" variant="ghost" size="sm">Sign in</ButtonLink>
              <ButtonLink href="/get-started" size="sm">Get started</ButtonLink>
            </>
          )}
        </div>
        <button className="rounded-control p-2 text-ink md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>
      {open ? (
        <div className="border-t border-line bg-canvas px-5 pb-6 md:hidden">
          <div className="flex flex-col py-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-[15px] font-medium text-ink">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href="/sign-in" variant="secondary">Sign in</ButtonLink>
            <ButtonLink href="/get-started">Get started</ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}
