import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRoomFilters } from '@/features/rooms/hooks/useRoomFilters';
import { validateFilterDate, validateFilterRange } from '@/features/rooms/services/roomService';
import type { Equipment } from '@/features/rooms/types/room';
import { Button } from '@/shared/components/Button';
import { Chip } from '@/shared/components/Chip';
import { Field } from '@/shared/components/Field';
import { colors, radius, spacing } from '@/shared/components/theme';
import { COMPANY_TIMEZONE_LABEL, addDays, isValidDateString } from '@/shared/utils/dateTime';

const CAPACITY_OPTIONS: (number | null)[] = [null, 4, 8, 12];

export function RoomFilters({ equipment }: { equipment: Equipment[] }) {
  const { filters, setDate, setStartTime, setEndTime, setMinimumCapacity, toggleEquipment, reset } = useRoomFilters();
  const [expanded, setExpanded] = useState(true);
  const dateError = validateFilterDate(filters.date);
  const rangeError = validateFilterRange(filters);
  const shiftDate = (days: number) => {
    if (isValidDateString(filters.date)) setDate(addDays(filters.date, days));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Filters</Text>
          <Text style={styles.timezone} testID="company-timezone">
            Times in {COMPANY_TIMEZONE_LABEL}
          </Text>
        </View>
        <Button
          title={expanded ? 'Hide' : 'Show'}
          variant="secondary"
          onPress={() => setExpanded((value) => !value)}
          testID="toggle-filters"
          accessibilityLabel={expanded ? 'Hide filters' : 'Show filters'}
        />
      </View>
      {expanded ? (
        <View style={styles.body}>
          <View style={styles.dateRow}>
            <Button title="◀" variant="secondary" onPress={() => shiftDate(-1)} accessibilityLabel="Previous day" testID="date-prev" />
            <View style={styles.flex}>
              <Field
                label="Date"
                testID="filter-date"
                value={filters.date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                error={dateError ?? undefined}
              />
            </View>
            <Button title="▶" variant="secondary" onPress={() => shiftDate(1)} accessibilityLabel="Next day" testID="date-next" />
          </View>
          <View style={styles.timeRow}>
            <View style={styles.flex}>
              <Field
                label="Start time"
                testID="filter-start"
                value={filters.startTime}
                onChangeText={setStartTime}
                placeholder="HH:mm"
                maxLength={5}
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="End time"
                testID="filter-end"
                value={filters.endTime}
                onChangeText={setEndTime}
                placeholder="HH:mm"
                maxLength={5}
              />
            </View>
          </View>
          {rangeError ? (
            <Text style={styles.error} testID="filter-range-error" accessibilityRole="alert">
              {rangeError}
            </Text>
          ) : null}

          <Text style={styles.label}>Minimum capacity</Text>
          <View style={styles.chips}>
            {CAPACITY_OPTIONS.map((option) => (
              <Chip
                key={option ?? 'any'}
                label={option === null ? 'Any' : `${option}+`}
                selected={filters.minimumCapacity === option}
                onPress={() => setMinimumCapacity(option)}
                testID={`capacity-${option ?? 'any'}`}
              />
            ))}
          </View>

          <Text style={styles.label}>Equipment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {equipment.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={filters.equipment.includes(item.id)}
                onPress={() => toggleEquipment(item.id)}
                testID={`equipment-${item.id}`}
              />
            ))}
          </ScrollView>
          <Button title="Clear filters" variant="secondary" onPress={reset} testID="clear-filters" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  timezone: { fontSize: 11, color: colors.textMuted },
  body: { gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  error: { color: colors.danger, fontSize: 12 },
});
