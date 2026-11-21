import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildDaySlots, type DaySlot } from '@/features/bookings/services/bookingRules';
import { useSlotSelection } from '@/features/rooms/hooks/useSlotSelection';
import type { RoomSchedule } from '@/features/rooms/types/room';
import { Button } from '@/shared/components/Button';
import { colors, radius, spacing } from '@/shared/components/theme';
import { now as clockNow } from '@/shared/utils/clock';
import { COMPANY_TIMEZONE_LABEL, toCompanyTime } from '@/shared/utils/dateTime';

export interface SelectedSlotRange {
  roomId: string;
  date: string;
  /** `HH:mm` in the company timezone. */
  startTime: string;
  endTime: string;
}

interface RoomTimelineProps {
  schedule: RoomSchedule;
  /** Injectable for deterministic rendering; defaults to the app clock. */
  now?: Date;
  onBook?: (range: SelectedSlotRange) => void;
}

interface SlotRowProps {
  slot: DaySlot;
  index: number;
  selected: boolean;
  onPress: (index: number) => void;
}

const SlotRow = memo(function SlotRow({ slot, index, selected, onPress }: SlotRowProps) {
  const start = toCompanyTime(slot.startTime);
  const end = toCompanyTime(slot.endTime);
  const label =
    slot.state === 'BOOKED'
      ? `${start} to ${end}, booked${slot.booking ? `: ${slot.booking.title}` : ''}`
      : slot.state === 'PAST'
        ? `${start} to ${end}, past`
        : `${start} to ${end}, available${selected ? ', selected' : ''}`;
  return (
    <Pressable
      testID={`slot-${start}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: slot.state !== 'AVAILABLE', selected }}
      disabled={slot.state !== 'AVAILABLE'}
      onPress={() => onPress(index)}
      style={[
        styles.slot,
        slot.state === 'AVAILABLE' && styles.available,
        slot.state === 'BOOKED' && styles.booked,
        slot.state === 'PAST' && styles.past,
        selected && styles.selected,
      ]}
    >
      <Text style={[styles.time, selected && styles.selectedText]}>{start}</Text>
      <Text style={[styles.state, selected && styles.selectedText]} numberOfLines={1}>
        {selected
          ? 'Selected'
          : slot.state === 'BOOKED'
            ? (slot.booking?.title ?? 'Booked')
            : slot.state === 'PAST'
              ? 'Past'
              : 'Available'}
      </Text>
    </Pressable>
  );
});

/** Memoized daily timeline of fixed 30-minute booked/available slots. */
export function RoomTimeline({ schedule, now, onBook }: RoomTimelineProps) {
  const current = now ?? clockNow();
  const nowKey = Math.floor(current.getTime() / 60_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slots = useMemo(() => buildDaySlots(schedule.date, schedule.bookings, current), [schedule, nowKey]);
  const selection = useSlotSelection((state) => state.selection);
  const select = useSlotSelection((state) => state.select);
  const clear = useSlotSelection((state) => state.clear);

  // Drop a selection that belongs to another room/date or became unavailable after a refresh.
  const active =
    selection && selection.roomId === schedule.roomId && selection.date === schedule.date ? selection : null;
  const stillFree = active
    ? slots.slice(active.start, active.end + 1).every((slot) => slot.state === 'AVAILABLE')
    : false;
  useEffect(() => {
    if (selection && (!active || !stillFree)) clear();
  }, [selection, active, stillFree, clear]);

  const onPressSlot = (index: number) => select(schedule.roomId, schedule.date, index, slots);
  const range = active && stillFree ? { start: slots[active.start], end: slots[active.end] } : null;

  return (
    <View testID="room-timeline" style={styles.container}>
      <Text style={styles.legendText} testID="timeline-timezone">
        Timezone: {COMPANY_TIMEZONE_LABEL}
      </Text>
      <View style={styles.legend}>
        <Legend color={colors.available} label="Available" />
        <Legend color={colors.booked} label="Booked" />
        <Legend color={colors.past} label="Past" />
      </View>
      {slots.map((slot, index) => (
        <SlotRow
          key={slot.startTime}
          slot={slot}
          index={index}
          selected={Boolean(active && stillFree && index >= active.start && index <= active.end)}
          onPress={onPressSlot}
        />
      ))}
      {range ? (
        <View style={styles.footer}>
          <Text style={styles.summary} testID="selection-summary">
            {toCompanyTime(range.start.startTime)}–{toCompanyTime(range.end.endTime)}
          </Text>
          <Button
            title="Book this time"
            testID="book-selected"
            onPress={() =>
              onBook?.({
                roomId: schedule.roomId,
                date: schedule.date,
                startTime: toCompanyTime(range.start.startTime),
                endTime: toCompanyTime(range.end.endTime),
              })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  legend: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: radius.sm },
  legendText: { color: colors.textMuted, fontSize: 12 },
  slot: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  available: { backgroundColor: colors.available },
  booked: { backgroundColor: colors.booked },
  past: { backgroundColor: colors.past },
  selected: { backgroundColor: colors.selected },
  time: { width: 48, color: colors.text, fontWeight: '600' },
  state: { flex: 1, color: colors.text, fontSize: 13 },
  selectedText: { color: colors.primaryText },
  footer: { marginTop: spacing.md, gap: spacing.sm },
  summary: { color: colors.text, fontWeight: '700', fontSize: 16, textAlign: 'center' },
});
