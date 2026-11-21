import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingForm } from '@/features/bookings/components/BookingForm';
import type { Booking } from '@/features/bookings/types/booking';
import { useRoom } from '@/features/rooms/hooks/useRooms';
import { useSlotSelection } from '@/features/rooms/hooks/useSlotSelection';
import { Button } from '@/shared/components/Button';
import { colors, radius, spacing } from '@/shared/components/theme';
import { formatCompanyRange } from '@/shared/utils/dateTime';

export default function BookingRoute() {
  const params = useLocalSearchParams<{ roomId: string; date?: string; startTime?: string; endTime?: string }>();
  const room = useRoom(params.roomId);
  const clearSelection = useSlotSelection((state) => state.clear);
  const [created, setCreated] = useState<Booking | null>(null);

  if (created) {
    return (
      <View style={styles.confirmation} testID="booking-confirmation">
        <Text style={styles.title}>Room booked</Text>
        <Text style={styles.text}>{created.title}</Text>
        <Text style={styles.text}>{created.roomName}</Text>
        <Text style={styles.text}>{formatCompanyRange(created.startTime, created.endTime)}</Text>
        <Button title="View my bookings" onPress={() => router.replace('/bookings')} testID="view-bookings" />
        <Button title="Done" variant="secondary" onPress={() => router.back()} testID="booking-done" />
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <BookingForm
        roomId={params.roomId}
        roomName={room.data?.name}
        initialValues={{ date: params.date, startTime: params.startTime, endTime: params.endTime }}
        onCreated={(booking) => {
          clearSelection();
          setCreated(booking);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, backgroundColor: colors.background },
  confirmation: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.success },
  text: { fontSize: 16, color: colors.text },
});
