import { StyleSheet, Text, View } from 'react-native';

import type { RoomStatus } from '@/features/rooms/types/room';
import { colors, radius, spacing } from '@/shared/components/theme';

const LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Available',
  IN_USE: 'In use',
  UPCOMING_BOOKING: 'Upcoming booking',
};

const TONES: Record<RoomStatus, { background: string; color: string }> = {
  AVAILABLE: { background: colors.successSoft, color: colors.success },
  IN_USE: { background: colors.dangerSoft, color: colors.danger },
  UPCOMING_BOOKING: { background: colors.warningSoft, color: colors.warning },
};

export function roomStatusLabel(status: RoomStatus): string {
  return LABELS[status];
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const tone = TONES[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]} testID={`room-status-${status}`}>
      <Text style={[styles.text, { color: tone.color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  text: { fontSize: 12, fontWeight: '600' },
});
