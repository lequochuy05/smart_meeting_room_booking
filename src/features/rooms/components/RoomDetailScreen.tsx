import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoomStatusBadge } from '@/features/rooms/components/RoomStatusBadge';
import { RoomTimeline, type SelectedSlotRange } from '@/features/rooms/components/RoomTimeline';
import { useRoomFilters } from '@/features/rooms/hooks/useRoomFilters';
import { useEquipment, useRoom, useRoomSchedule } from '@/features/rooms/hooks/useRooms';
import { useSlotSelection } from '@/features/rooms/hooks/useSlotSelection';
import { Button } from '@/shared/components/Button';
import { QueryStateView } from '@/shared/components/QueryStateView';
import { colors, radius, spacing } from '@/shared/components/theme';
import { addDays, formatCompanyDate, combineDateAndTime } from '@/shared/utils/dateTime';

interface RoomDetailScreenProps {
  roomId: string;
  onBook: (range: SelectedSlotRange) => void;
  now?: Date;
}

export function RoomDetailScreen({ roomId, onBook, now }: RoomDetailScreenProps) {
  const initialDate = useRoomFilters((state) => state.filters.date);
  const [date, setDate] = useState(initialDate);
  const clearSelection = useSlotSelection((state) => state.clear);
  const room = useRoom(roomId);
  const equipment = useEquipment();
  const schedule = useRoomSchedule(roomId, date);

  const shift = (days: number) => {
    clearSelection();
    setDate((value) => addDays(value, days));
  };

  return (
    <ScrollView contentContainerStyle={styles.content} testID="room-detail">
      <QueryStateView
        query={room}
        empty={{ title: 'Room not found' }}
        loadingMessage="Loading room…"
        errorTitle="Couldn't load room"
      >
        {(data) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{data.name}</Text>
              <RoomStatusBadge status={data.status} />
            </View>
            <Text style={styles.meta}>
              {data.capacity} seats · {data.floor}
            </Text>
            <Text style={styles.meta}>
              {data.equipment.length > 0
                ? data.equipment.map((id) => equipment.data?.find((item) => item.id === id)?.name ?? id).join(' · ')
                : 'No equipment'}
            </Text>
          </View>
        )}
      </QueryStateView>

      <View style={styles.dateRow}>
        <Button title="◀" variant="secondary" onPress={() => shift(-1)} accessibilityLabel="Previous day" testID="timeline-prev" />
        <Text style={styles.date} testID="timeline-date">
          {formatCompanyDate(combineDateAndTime(date, '12:00'))}
        </Text>
        <Button title="▶" variant="secondary" onPress={() => shift(1)} accessibilityLabel="Next day" testID="timeline-next" />
      </View>

      <View style={styles.timeline}>
        <QueryStateView
          query={schedule}
          empty={{ title: 'No schedule available' }}
          loadingMessage="Loading timeline…"
          errorTitle="Couldn't load the timeline"
        >
          {(data) => <RoomTimeline schedule={data} now={now} onBook={onBook} />}
        </QueryStateView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 16, fontWeight: '600', color: colors.text },
  timeline: { minHeight: 200 },
});
