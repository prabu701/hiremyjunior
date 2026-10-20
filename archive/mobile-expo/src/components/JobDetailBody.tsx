import { Avatar, FONTS, Icon, InfoRows, Monogram, Text, toneFor, useTheme } from '@hmj/ui';
import { Image, ScrollView, View } from 'react-native';
import { distance, rate, shiftLabel } from '@/lib/format';
import { jobImageUrl, type JobDetail } from '@/lib/jobs';

/** Prototype "Teen — Job Detail" content; shared by teen, parent and employer views. */
export function JobDetailBody({ job }: { job: JobDetail }) {
  const { t, radius } = useTheme();
  const upcoming = job.shifts.filter((s) => new Date(s.end_at) > new Date());
  return (
    <>
      <View style={{ alignItems: 'center', gap: 12 }}>
        {job.images[0] ? (
          <Image source={{ uri: jobImageUrl(job.images[0]) }} style={{ width: 88, height: 88, borderRadius: radius.tile }} />
        ) : (
          <Monogram label={job.title} tone={toneFor(job.id)} size={72} />
        )}
        <Text variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">{job.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar name={job.employer.name} size={28} tone={toneFor(job.employer.id)} />
          <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 13.5 }}>{job.employer.name}</Text>
          <Icon name="shield" size={14} color={t.tint3c} />
          <Text variant="caption">{job.employer.kind === 'business' ? 'Verified business' : 'Background-checked'}</Text>
        </View>
      </View>

      <InfoRows
        rows={[
          { label: 'Rate', value: rate(job.rate_cents, job.pay_type), accent: true },
          { label: 'Location', value: distance(job.distance_mi, job.city) || job.city },
          { label: 'Schedule', value: job.schedule_note ?? `${upcoming.length} upcoming shift${upcoming.length === 1 ? '' : 's'}` },
          { label: 'Category', value: job.category_name },
        ]}
      />

      <View style={{ gap: 8 }}>
        <Text variant="heading" style={{ fontSize: 15 }}>About this job</Text>
        <Text style={{ fontSize: 14, lineHeight: 21 }}>{job.description}</Text>
      </View>

      {upcoming.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>When</Text>
          {upcoming.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="calendar" size={16} color={t.muted} />
              <Text style={{ fontSize: 13.5 }}>{shiftLabel(s.start_at, s.end_at)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {job.images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {job.images.map((p) => (
            <Image key={p} source={{ uri: jobImageUrl(p) }} style={{ width: 140, height: 100, borderRadius: radius.tile }} />
          ))}
        </ScrollView>
      ) : null}
    </>
  );
}
