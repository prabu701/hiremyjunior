'use client';
import { isSelfServeRole, ROLE_COPY, type AppRole } from '@hmj/shared';
import { Briefcase, CalendarCheck, CheckCircle2, Home, LogOut, Search, Settings, ShieldCheck, UserRound, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth';
import { useMyBookings } from '@/lib/bookings';
import { cn } from '@/lib/cn';

interface NavItem { href: string; label: string; Icon: LucideIcon; badge?: number; exact?: boolean }

function useNav(role: AppRole): NavItem[] {
  const bookings = useMyBookings();
  const waiting = (bookings.data ?? []).filter((b) => b.needs_action).length || undefined;
  switch (role) {
    case 'junior':
      return [
        { href: '/teen', label: 'Home', Icon: Home, exact: true },
        { href: '/teen/search', label: 'Find jobs', Icon: Search },
        { href: '/teen/requests', label: 'My jobs', Icon: CalendarCheck, badge: waiting },
        { href: '/teen/profile', label: 'Profile', Icon: UserRound },
        { href: '/settings', label: 'Settings', Icon: Settings },
      ];
    case 'parent':
      return [
        { href: '/parent', label: 'Home', Icon: Home, exact: true },
        { href: '/parent/approvals', label: 'Approvals', Icon: CheckCircle2, badge: waiting },
        { href: '/parent/teens', label: 'My teens', Icon: Users },
        { href: '/settings', label: 'Settings', Icon: Settings },
      ];
    case 'employer':
      return [
        { href: '/employer', label: 'Home', Icon: Home, exact: true },
        { href: '/employer/jobs', label: 'Jobs', Icon: Briefcase, badge: waiting },
        { href: '/employer/teens', label: 'Find teens', Icon: Search },
        { href: '/settings', label: 'Settings', Icon: Settings },
      ];
    default:
      return [
        { href: '/admin', label: 'Review queue', Icon: ShieldCheck },
        { href: '/settings', label: 'Settings', Icon: Settings },
      ];
  }
}

const roleLabel = (role: AppRole) => (isSelfServeRole(role) ? ROLE_COPY[role].label : 'Ops');

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const nav = useNav(profile?.role ?? 'junior');
  const active = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`));

  async function doSignOut() {
    await signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-nav px-4 py-6 lg:flex">
        <Link href="/home" className="flex items-center gap-2.5 px-2">
          <LogoMark />
          <span className="font-display text-[19px] font-semibold text-ink">HireMy<span className="text-accent">Junior</span></span>
        </Link>
        <nav className="mt-9 flex flex-1 flex-col gap-1" aria-label="App">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n) ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-control px-3 py-2.5 text-[14.5px] font-semibold transition-colors',
                active(n) ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <n.Icon className="size-[18px]" />
              <span className="flex-1">{n.label}</span>
              {n.badge ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent">{n.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <UserMenu name={profile?.full_name ?? profile?.email ?? ''} sub={profile ? `${roleLabel(profile.role)} account` : ''} onSignOut={doSignOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-15 items-center justify-between border-b border-line bg-nav/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-display text-[17px] font-semibold text-ink">HireMy<span className="text-accent">Junior</span></span>
        </Link>
        <button onClick={doSignOut} className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[13px] font-semibold text-muted" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="min-w-0 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="App">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n) ? 'page' : undefined} className={cn('relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', active(n) ? 'text-accent' : 'text-muted')}>
            <n.Icon className="size-5" />
            {n.label}
            {n.badge ? <span className="absolute left-1/2 top-1.5 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{n.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function UserMenu({ name, sub, onSignOut }: { name: string; sub: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {open ? (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-card border border-line bg-surface p-1 shadow-lift">
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-2">
            <Settings className="size-4 text-muted" /> Settings
          </Link>
          <button onClick={onSignOut} data-testid="sign-out" className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-2">
            <LogOut className="size-4 text-muted" /> Sign out
          </button>
        </div>
      ) : null}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-strong">
        <Avatar name={name} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
          <span className="block truncate text-[12.5px] text-muted">{sub}</span>
        </span>
      </button>
    </div>
  );
}
