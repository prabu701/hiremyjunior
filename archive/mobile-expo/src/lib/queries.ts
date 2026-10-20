import { QueryClient, useQuery } from '@tanstack/react-query';
import { rpc, toAppError } from './rpc';
import { supabase } from './supabase';
import { useAuth } from './auth';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
});

/** Unwrap a Supabase response, converting errors to AppError. */
function unwrap<T>({ data, error }: { data: T; error: Parameters<typeof toAppError>[0] }): T {
  if (error) throw toAppError(error);
  return data;
}

export function useRequirements() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['requirements', session?.user.id],
    enabled: !!session,
    queryFn: () => rpc('my_requirements'),
  });
}

export function useMyJunior() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['junior', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await supabase.from('juniors').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

export function useMyParent() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['parent', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await supabase.from('parents').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

export function useMyEmployer() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['employer', session?.user.id],
    enabled: !!session,
    queryFn: async () => unwrap(await supabase.from('employers').select('*').eq('profile_id', session!.user.id).maybeSingle()),
  });
}

/** Guardianships with the other party's name. RLS limits rows to ones the caller is part of. */
export function useGuardianships() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['guardianships', session?.user.id],
    enabled: !!session,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('guardianships')
          .select('*, parent:profiles!guardianships_parent_id_fkey(full_name, email), junior:profiles!guardianships_junior_id_fkey(full_name, email)')
          .neq('status', 'revoked')
          .order('created_at'),
      ),
  });
}

/** Invalidate everything tied to the signed-in user's setup state. */
export function invalidateSetup() {
  return Promise.all(
    ['requirements', 'junior', 'parent', 'employer', 'guardianships', 'verifications'].map((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    ),
  );
}

/** The caller's verification attempts, newest first (RLS: own rows only). */
export function useMyVerifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['verifications', session?.user.id],
    enabled: !!session,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('verifications')
          .select('id, kind, status, provider, details, failure_reason, verified_at, created_at')
          .eq('subject_id', session!.user.id)
          .order('created_at', { ascending: false }),
      ),
  });
}

export type VerificationKind = import('@hmj/shared').Enums<'verification_kind'>;

/** Latest attempt for one kind of check (live attempt preferred), polling while it's in flight. */
export function useLatestVerification(kind: VerificationKind) {
  const q = useMyVerifications();
  const rows = q.data?.filter((v) => v.kind === kind) ?? [];
  const live = rows.find((v) => ['pending', 'processing', 'needs_review', 'verified'].includes(v.status));
  return { ...q, latest: live ?? rows[0] ?? null };
}
