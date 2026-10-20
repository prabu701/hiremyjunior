import { Card, FONTS, Monogram, Text, toneFor, useTheme } from '@hmj/ui';
import { Image, View } from 'react-native';
import { distance, rate } from '@/lib/format';
import { jobImageUrl } from '@/lib/jobs';

/** Prototype home-feed row: monogram (or first photo), title, distance · city, rate. */
export function JobCard({ job, onPress, meta }: {
  job: { id: string; title: string; rate_cents: number; pay_type: 'hourly' | 'fixed'; city: string; distance_mi?: number | null; image_path?: string | null };
  onPress: () => void;
  meta?: string;
}) {
  const { t, radius } = useTheme();
  return (
    <Card testID={`job-${job.id}`} onPress={onPress} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }} accessibilityLabel={job.title}>
      {job.image_path ? (
        <Image source={{ uri: jobImageUrl(job.image_path) }} style={{ width: 52, height: 52, borderRadius: radius.tile }} />
      ) : (
        <Monogram label={job.title} tone={toneFor(job.id)} />
      )}
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14.5 }} numberOfLines={1}>{job.title}</Text>
        <Text style={{ fontSize: 12.5 }} muted numberOfLines={1}>{meta ?? distance(job.distance_mi, job.city)}</Text>
      </View>
      <Text style={{ fontFamily: FONTS.display, fontSize: 15 }} color={t.accent}>{rate(job.rate_cents, job.pay_type)}</Text>
    </Card>
  );
}
