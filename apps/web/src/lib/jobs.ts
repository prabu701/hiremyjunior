'use client';
import { useQuery } from '@tanstack/react-query';
import type { Enums } from '@hmj/shared';
import { useAuth } from './auth';
import { rpc, toAppError } from './rpc';
import { getSupabase } from './supabase/client';

export type JobTrack = Enums<'job_track'>;

export interface JobDetail {
  id: string;
  title: string;
  description: string;
  track: JobTrack;
  status: Enums<'job_status'>;
  category_id: string;
  category_name: string;
  pay_type: Enums<'pay_type'>;
  rate_cents: number;
  openings: number;
  schedule_note: string | null;
  city: string;
  zip: string;
  distance_mi: number | null;
  employer: { id: string; name: string; kind: Enums<'employer_kind'>; jobs_posted: number };
  shifts: { id: string; start_at: string; end_at: string }[];
  images: string[];
  address: { line: string; notes: string | null } | null;
}

export interface JuniorCard {
  id: string;
  display_name: string;
  age_band: string | null;
  city: string;
  distance_mi: number | null;
  bio: string | null;
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  availability: string | null;
  skill_names: string[];
}

export function jobImageUrl(path: string): string {
  return getSupabase().storage.from('job-images').getPublicUrl(path).data.publicUrl;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('job_categories').select('*').eq('active', true).order('sort');
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('skills').select('*').order('sort');
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useJobSearch(params: { q?: string; category?: string | null; radius?: number | null }) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['job-search', params],
    enabled: !!session,
    queryFn: () => rpc('search_jobs', { q: params.q || undefined, category: params.category ?? undefined, radius_mi: params.radius ?? undefined }),
  });
}

export function useJobDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    enabled: !!id,
    queryFn: async () => (await rpc('job_detail', { job_id: id! })) as unknown as JobDetail,
  });
}

export function useMyJobs() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-jobs', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('jobs')
        .select('id, title, status, rate_cents, pay_type, category_id, city, schedule_note, created_at, job_shifts(start_at, end_at), job_images(path, position)')
        .order('created_at', { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useJuniorSearch(params: { q?: string; skill?: string | null }) {
  const { session, profile } = useAuth();
  return useQuery({
    queryKey: ['junior-search', params],
    enabled: !!session && profile?.status === 'active',
    queryFn: () => rpc('search_juniors', { q: params.q || undefined, skill: params.skill ?? undefined }),
  });
}

export function useJuniorCard(id: string | undefined) {
  return useQuery({
    queryKey: ['junior-card', id],
    enabled: !!id,
    queryFn: async () => (await rpc('junior_card', { junior_id: id! })) as unknown as JuniorCard,
  });
}

export function useMySkills() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-skills', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('junior_skills').select('skill_id, skills(name, sort)').eq('junior_id', session!.user.id);
      if (error) throw toAppError(error);
      return data;
    },
  });
}
