import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEmployeeSearch } from '@/features/bookings/hooks/useEmployeeSearch';
import type { Participant } from '@/features/bookings/types/participant';
import { Chip } from '@/shared/components/Chip';
import { Field } from '@/shared/components/Field';
import { colors, radius, spacing } from '@/shared/components/theme';
import { toAppError } from '@/shared/api/types';

interface ParticipantPickerProps {
  selected: Participant[];
  onChange: (participants: Participant[]) => void;
  error?: string;
}

/** Employee-directory-backed participant selection (no free-form guests). */
export function ParticipantPicker({ selected, onChange, error }: ParticipantPickerProps) {
  const [query, setQuery] = useState('');
  const search = useEmployeeSearch(query);
  const selectedIds = new Set(selected.map((p) => p.id));
  const results = (search.data ?? []).filter((p) => !selectedIds.has(p.id));
  const showResults = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <Field
        label="Participants"
        testID="participant-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search employees by name or email"
        autoCapitalize="none"
        error={error}
      />
      {selected.length > 0 ? (
        <View style={styles.chips} testID="selected-participants">
          {selected.map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} ✕`}
              selected
              onPress={() => onChange(selected.filter((item) => item.id !== p.id))}
              testID={`remove-participant-${p.id}`}
            />
          ))}
        </View>
      ) : null}
      {showResults ? (
        <View style={styles.results}>
          {search.isError ? (
            <Pressable onPress={() => void search.refetch()} accessibilityRole="button" testID="participant-retry">
              <Text style={styles.error}>{toAppError(search.error).message} Tap to retry.</Text>
            </Pressable>
          ) : search.isFetching && !search.data ? (
            <Text style={styles.muted}>Searching…</Text>
          ) : results.length === 0 ? (
            <Text style={styles.muted} testID="participant-empty">
              No matching employees found.
            </Text>
          ) : (
            results.map((p) => (
              <Pressable
                key={p.id}
                testID={`participant-option-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Add ${p.name}`}
                onPress={() => {
                  onChange([...selected, p]);
                  setQuery('');
                }}
                style={styles.option}
              >
                <Text style={styles.optionName}>{p.name}</Text>
                <Text style={styles.muted}>{p.email}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionName: { color: colors.text, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 13, padding: spacing.md },
  error: { color: colors.danger, fontSize: 13, padding: spacing.md },
});
