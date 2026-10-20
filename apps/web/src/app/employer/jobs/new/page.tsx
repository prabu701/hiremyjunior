'use client';
import { JobForm } from '@/components/app/JobForm';
import { PageHeader } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useMyEmployer } from '@/lib/queries';

export default function NewJob() {
  const e = useMyEmployer();
  if (e.isLoading) return <PageSpinner />;
  return (
    <div className="space-y-8">
      <PageHeader title="Post a job" subtitle="It takes about two minutes. Verified teens nearby will see it right away." />
      <JobForm initial={null} defaults={{ zip: e.data?.zip ?? '', city: e.data?.city ?? '' }} track={e.data?.kind === 'business' ? 'regulated' : 'casual'} />
    </div>
  );
}
