import { Button, Card, Icon, Notice, Screen, Text, useTheme } from '@hmj/ui';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useAuth } from '@/lib/auth';
import { invalidateSetup, useLatestVerification } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';
import { uploadAsset } from '@/lib/upload';

/** Prototype "Teen — Verify School ID", reframed: a document is a supporting signal reviewed by
 *  HMJ; the parent's attestation is what establishes age. */
export default function ProofOfAge() {
  const { session } = useAuth();
  const { t, radius } = useTheme();
  const { latest } = useLatestVerification('proof_of_age');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const status = latest?.status;
  const locked = status === 'needs_review' || status === 'verified';
  const done = () => (router.canGoBack() ? router.back() : router.replace('/teen'));

  async function pick(source: 'camera' | 'library') {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8, allowsEditing: false };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Camera access is needed to take the photo. You can upload from your library instead.');
    }
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setAsset(res.assets[0]);
  }

  async function submit() {
    if (!asset || !session) return;
    setError(null);
    setBusy(true);
    try {
      const path = await uploadAsset('verification-docs', session.user.id, `proof-of-age-${Date.now()}`, asset);
      await rpc('submit_proof_of_age', { evidence_path: path });
      await invalidateSetup();
      setAsset(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={done}
      headerLabel="Verify your age"
      footer={locked ? <Button label="Done" onPress={done} /> : <Button testID="submit-poa" label="Verify & Finish" onPress={submit} loading={busy} disabled={!asset} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" accessibilityRole="header">Upload proof of age</Text>
        <VerificationBadge status={status} />
      </View>
      <Text muted>
        A photo of a document with your name and date of birth — a school ID that shows your birthday, a state ID, passport, or birth certificate.
      </Text>

      {locked ? (
        <Notice tone={status === 'verified' ? 3 : 2} icon={status === 'verified' ? 'check' : 'clock'}>
          {status === 'verified' ? 'Your age is verified.' : 'Thanks! Our team reviews documents within 1 business day.'}
        </Notice>
      ) : (
        <>
          <Pressable
            testID="pick-document"
            onPress={() => pick(Platform.OS === 'web' ? 'library' : 'camera')}
            accessibilityRole="button"
            style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: t.tint1c, backgroundColor: t.tint1, borderRadius: radius.card, padding: 24, alignItems: 'center', gap: 10, minHeight: 180, justifyContent: 'center' }}
          >
            {asset ? (
              <Image source={{ uri: asset.uri }} style={{ width: '100%', height: 180, borderRadius: radius.tile }} resizeMode="contain" accessibilityLabel="Selected document" />
            ) : (
              <>
                <Icon name="camera" size={32} color={t.tint1c} />
                <Text style={{ fontWeight: '600' }} color={t.tint1c}>{Platform.OS === 'web' ? 'Choose a photo of your document' : 'Take a photo of your document'}</Text>
                {Platform.OS !== 'web' ? (
                  <Pressable onPress={() => pick('library')} hitSlop={8}>
                    <Text variant="caption" color={t.tint1c}>or upload from your library</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </Pressable>
          {status === 'failed' ? <Notice icon="alert">{`Last upload wasn't accepted: ${latest?.failure_reason ?? 'please try again'}.`}</Notice> : null}
        </>
      )}

      <Card padding={14} style={{ gap: 8 }}>
        {['Confirms your age for employers', 'Only your name and age are shared — never the document', 'Your parent’s confirmation also counts toward this'].map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="check" size={16} color={t.tint3c} />
            <Text style={{ fontSize: 13, flex: 1 }}>{line}</Text>
          </View>
        ))}
      </Card>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
