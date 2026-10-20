import { Avatar, Badge, Card, Text } from '@hmj/ui';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useGuardianships } from '@/lib/queries';

/** Linked parents (teen view) or linked teens (parent view), with link status. */
export function GuardianList({ onPressItem, emptyText }: { onPressItem?: (id: string) => void; emptyText: string }) {
  const { profile } = useAuth();
  const { data } = useGuardianships();
  const asParent = profile?.role === 'parent';
  if (!data?.length) return <Text variant="caption">{emptyText}</Text>;
  return (
    <View style={{ gap: 10 }}>
      {data.map((g) => {
        const other = asParent ? g.junior : g.parent;
        const pending = g.status === 'pending';
        return (
          <Card
            key={g.id}
            testID={`guardianship-${g.id}`}
            onPress={onPressItem ? () => onPressItem(g.id) : undefined}
            padding={14}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessibilityLabel={other?.full_name ?? 'Linked account'}
          >
            <Avatar name={other?.full_name} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14.5 }}>{other?.full_name ?? other?.email ?? 'Unknown'}</Text>
              <Text variant="caption">
                {pending ? (asParent ? 'Wants to link — tap to confirm' : 'Waiting for them to confirm') : asParent ? 'Linked teen' : 'Parent / guardian'}
              </Text>
            </View>
            <Badge label={pending ? 'Pending' : 'Linked'} tone={pending ? 1 : 3} />
          </Card>
        );
      })}
    </View>
  );
}
