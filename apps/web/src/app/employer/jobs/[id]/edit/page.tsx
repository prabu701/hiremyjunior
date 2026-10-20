'use client';
import { useParams } from 'next/navigation';
import { JobForm } from '@/components/app/JobForm';
import { PageHeader } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useJobDetail } from '@/lib/jobs';
import { useMyEmployer } from '@/lib/queries';

export default function EditJob() {
  const { id } = useParams<{ id: string }>();
  const job = useJobDetail(id);
  const e = useMyEmployer();
  if (job.isLoading || e.isLoading || !job.data) return <PageSpinner />;
  return (
    <div className="space-y-8">
      <PageHeader title="Edit job" subtitle={job.data.title} />
      <JobForm initial={job.data} defaults={{ zip: job.data.zip, city: job.data.city }} track={e.data?.kind === 'business' ? 'regulated' : 'casual'} />
    </div>
  );
}
