import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <path d="M12.5 28V12m0 8h10m0-8v16" stroke="var(--on-accent)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="29" cy="13.5" r="2.6" fill="var(--on-accent)" opacity="0.85" />
    </svg>
  );
}

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="HireMyJunior home">
      <LogoMark />
      <span className="font-display text-[21px] font-semibold tracking-tight text-ink">
        HireMy<span className="text-accent">Junior</span>
      </span>
    </Link>
  );
}
