'use client';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { rpc, unwrap } from './rpc';
import { getSupabase } from './supabase/client';

export function useRequirements() {
  const { session } = useAuth();
  return useQuery({ queryKey: ['requirements', session?.user.id], enabled: !!session, queryFn: () => rpc('my_requirements') });
}

export function useMyJunior() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['junior', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await getSupabase().from('juniors').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

export function useMyParent() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['parent', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await getSupabase().from('parents').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

export function useMyEmployer() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['employer', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await getSupabase().from('employers').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

/** Guardianships with the other party's name (RLS: only ones the caller is part of). */
export function useGuardianships() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['guardianships', session?.user.id],
    enabled: !!session,
    queryFn: async () =>
      unwrap(
        await getSupabase()
          .from('guardianships')
          .select('*, parent:profiles!guardianships_parent_id_fkey(full_name, email), junior:profiles!guardianships_junior_id_fkey(full_name, email)')
          .neq('status', 'revoked')
          .order('created_at'),
      ),
  });
}

export function useMyVerifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['verifications', session?.user.id],
    enabled: !!session,
    queryFn: async () =>
      unwrap(
        await getSupabase()
          .from('verifications')
          .select('id, kind, status, provider, details, failure_reason, verified_at, created_at') // never `*`: `secret` is not client-readable
          .eq('subject_id', session!.user.id)
          .order('created_at', { ascending: false }),
      ),
  });
}

export type VerificationKind = import('@hmj/shared').Enums<'verification_kind'>;

/** Latest attempt for one check (a live attempt is preferred over older failed ones). */
export function useLatestVerification(kind: VerificationKind) {
  const q = useMyVerifications();
  const rows = q.data?.filter((v) => v.kind === kind) ?? [];
  const live = rows.find((v) => ['pending', 'processing', 'needs_review', 'verified'].includes(v.status));
  return { ...q, latest: live ?? rows[0] ?? null };
}

/** Refresh everything tied to the signed-in user's setup state. */
export function invalidateSetup(qc: QueryClient) {
  return Promise.all(['requirements', 'junior', 'parent', 'employer', 'guardianships', 'verifications'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}
