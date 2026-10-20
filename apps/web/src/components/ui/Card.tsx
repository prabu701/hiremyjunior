import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const card = 'bg-surface border border-line rounded-card shadow-soft';
const interactive = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn(card, className)} {...rest} />;
}

export function CardLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return <Link className={cn(card, interactive, 'block', className)} {...rest} />;
}

export function CardButton({ className, ...rest }: ComponentProps<'button'>) {
  return <button type="button" className={cn(card, interactive, 'block w-full text-left', className)} {...rest} />;
}
