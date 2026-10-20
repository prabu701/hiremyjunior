import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-control transition-all duration-150 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-[0_6px_16px_-6px_var(--accent)] hover:bg-accent-strong hover:shadow-[0_10px_22px_-8px_var(--accent)]',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink/30 hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  soft: 'bg-accent-soft text-accent-ink hover:brightness-95',
  danger: 'bg-surface text-danger border border-danger/30 hover:bg-danger-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, block, loading, className, children, disabled, ...rest }: Common & ComponentProps<'button'> & { loading?: boolean }) {
  return (
    <button className={cn(base, variants[variant], sizes[size], block && 'w-full', className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, iconRight, block, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], block && 'w-full', className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
