'use client';
import { Search, Users } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { TeenCard } from '@/components/app/TeenCard';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { useJuniorSearch, useSkills } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

export default function FindTeens() {
  const { profile } = useAuth();
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const deferred = useDeferredValue(q);
  const skills = useSkills();
  const teens = useJuniorSearch({ q: deferred.trim(), skill: skill === 'all' ? null : skill });

  if (profile?.status !== 'active') {
    return (
      <div className="space-y-8">
        <PageHeader title="Find teens nearby" />
        <SetupChecklist title="Finish verification to search" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Find teens nearby" subtitle="Every teen here is linked to an ID-verified parent, who approves each job." />
      <label className="flex h-12 items-center gap-3 rounded-control border border-line-strong bg-surface px-4 shadow-soft focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <Search className="size-4.5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by skill or name" className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70" aria-label="Search teens" />
      </label>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip label="All" selected={skill === 'all'} onClick={() => setSkill('all')} />
        {(skills.data ?? []).map((s) => <Chip key={s.id} label={s.name} selected={skill === s.id} onClick={() => setSkill(s.id)} />)}
      </div>
      {teens.error ? <Alert tone="danger">{errorMessage(teens.error)}</Alert> : null}
      {teens.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : teens.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{teens.data.map((t) => <TeenCard key={t.id} teen={t} />)}</div>
      ) : (
        <EmptyState icon={<Users className="size-6" />} title="No teens match">Try another skill or a broader search.</EmptyState>
      )}
    </div>
  );
}
