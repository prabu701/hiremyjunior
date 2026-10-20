import { useQuery } from '@tanstack/react-query';
import { Button, InfoRows, Notice, Screen, Text, TextField, useTheme } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image } from 'react-native';
import { formatUsDate } from '@/components/DateField';
import { queryClient } from '@/lib/queries';
import { errorMessage, rpc, toAppError } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { KIND_LABEL } from '../index';

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, radius } = useTheme();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const q = useQuery({
    queryKey: ['admin-review', id],
    queryFn: async () => {
      const { data: v, error } = await supabase
        .from('verifications')
        .select('id, subject_id, kind, status, provider, evidence_path, details, created_at') // never `*`: secret is not client-readable
        .eq('id', id)
        .single();
      if (error) throw toAppError(error);
      const { data: p } = await supabase.from('profiles').select('full_name, email, role, phone').eq('id', v.subject_id).single();
      const { data: j } = await supabase.from('juniors').select('dob, dob_claimed, school_name').eq('profile_id', v.subject_id).maybeSingle();
      const { data: e } = await supabase.from('employers').select('legal_name, ubi, display_name').eq('profile_id', v.subject_id).maybeSingle();
      let docUrl: string | null = null;
      if (v.evidence_path) {
        const { data: signed } = await supabase.storage.from('verification-docs').createSignedUrl(v.evidence_path, 300);
        docUrl = signed?.signedUrl ?? null;
      }
      return { v, p, j, e, docUrl };
    },
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/admin'));

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? 'approve' : 'reject');
    try {
      await rpc('admin_review_verification', { verification_id: id, approve, reason: approve ? undefined : reason });
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (q.isLoading || !q.data) return <Screen onBack={back}>{q.error ? <Notice icon="alert">{errorMessage(q.error)}</Notice> : <ActivityIndicator color={t.accent} />}</Screen>;
  const { v, p, j, e, docUrl } = q.data;
  const simulated = v.provider.startsWith('mock');

  const rows = [
    { label: 'Person', value: p?.full_name ?? '—' },
    { label: 'Email', value: p?.email ?? '—' },
    { label: 'Role', value: p?.role ?? '—' },
  ];
  if (j) rows.push({ label: 'DOB (parent-attested)', value: formatUsDate(j.dob) || 'not yet' }, { label: 'DOB (teen entered)', value: formatUsDate(j.dob_claimed) }, { label: 'School', value: j.school_name });
  if (e?.ubi) rows.push({ label: 'Legal name', value: e.legal_name ?? '—' }, { label: 'UBI', value: e.ubi });
  const details = v.details as Record<string, string>;
  if (details?.name) rows.push({ label: 'Person checked', value: `${details.name} (${details.email})` });

  return (
    <Screen
      onBack={back}
      headerLabel="Review"
      footer={
        <>
          <Button testID="approve" label={simulated ? 'Simulate: check clear' : 'Approve'} onPress={() => decide(true)} loading={busy === 'approve'} />
          <Button testID="reject" label={simulated ? 'Simulate: check failed' : 'Reject'} variant="secondary" onPress={() => decide(false)} loading={busy === 'reject'} />
        </>
      }
    >
      <Text variant="title">{KIND_LABEL[v.kind] ?? v.kind}</Text>
      <InfoRows rows={rows} />
      {docUrl ? <Image source={{ uri: docUrl }} style={{ width: '100%', height: 260, borderRadius: radius.card, backgroundColor: t.card }} resizeMode="contain" accessibilityLabel="Submitted document" /> : null}
      {v.kind === 'business_registration' || v.kind === 'work_permit' ? (
        <Notice tone={2}>{`Look up the UBI on the WA Department of Revenue business lookup (secure.dor.wa.gov) and confirm the registration is active${v.kind === 'work_permit' ? ' and lists a Minor Work Permit endorsement' : ''}.`}</Notice>
      ) : null}
      {v.kind === 'proof_of_age' ? <Notice tone={2}>Check the name matches and the date of birth agrees with the parent-attested DOB.</Notice> : null}
      <TextField testID="reason" label="Reason (required to reject — the person sees it)" value={reason} onChangeText={setReason} placeholder="e.g. the photo is too blurry to read" />
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
