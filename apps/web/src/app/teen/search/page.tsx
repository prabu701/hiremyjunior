'use client';
import { Search, SearchX } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { JobCard } from '@/components/app/JobCard';
import { CategoryChips } from '@/components/app/JobFilters';
import { Alert } from '@/components/ui/Alert';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { useJobSearch } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

const RADII = [2, 5, 10, 25];

export default function TeenSearch() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [radius, setRadius] = useState(10);
  const deferred = useDeferredValue(q);
  const jobs = useJobSearch({ q: deferred.trim(), category: category === 'all' ? null : category, radius });

  return (
    <div className="space-y-7">
      <PageHeader title="Find jobs" subtitle="Only jobs you’re old enough for, from verified employers." />
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-control border border-line-strong bg-surface px-4 shadow-soft focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          <Search className="size-4.5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dog walking, tutoring, lawn…" className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70" aria-label="Search jobs" data-testid="search-input" autoFocus />
        </label>
        <div role="radiogroup" aria-label="Distance" className="flex rounded-control border border-line bg-surface p-1">
          {RADII.map((r) => (
            <button key={r} role="radio" aria-checked={radius === r} onClick={() => setRadius(r)} className={cn('h-10 flex-1 rounded-[calc(var(--r-control)-4px)] px-4 text-[13.5px] font-semibold', radius === r ? 'bg-ink text-canvas' : 'text-muted hover:text-ink')}>
              {r} mi
            </button>
          ))}
        </div>
      </div>
      <CategoryChips value={category} onChange={setCategory} />
      {jobs.error ? <Alert tone="danger">{errorMessage(jobs.error)}</Alert> : null}
      {jobs.data ? <p className="text-[14px] text-muted">{jobs.data.length} job{jobs.data.length === 1 ? '' : 's'} within {radius} miles</p> : null}
      {jobs.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : jobs.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{jobs.data.map((j) => <JobCard key={j.id} job={j} href={`/teen/jobs/${j.id}`} />)}</div>
      ) : (
        <EmptyState icon={<SearchX className="size-6" />} title="No matches">Try fewer words, another category or a bigger radius.</EmptyState>
      )}
    </div>
  );
}
