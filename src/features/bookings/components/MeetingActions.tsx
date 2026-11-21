import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMeetingActions } from '@/features/bookings/hooks/useMeetingActions';
import { canCancel, canCheckIn } from '@/features/bookings/services/meetingActions';
import type { Booking } from '@/features/bookings/types/booking';
import { Button } from '@/shared/components/Button';
import { colors, spacing } from '@/shared/components/theme';
import { toAppError } from '@/shared/api/types';

export interface ActionFeedback {
  type: 'success' | 'error';
  text: string;
}

interface MeetingActionsProps {
  booking: Booking;
  now: Date;
  /** Current employee; only the organizer may check in or cancel. */
  actorId?: string;
  onFeedback: (feedback: ActionFeedback) => void;
}

export function MeetingActions({ booking, now, actorId, onFeedback }: MeetingActionsProps) {
  const { checkIn, cancel } = useMeetingActions();
  const [confirming, setConfirming] = useState(false);
  const checkInState = canCheckIn(booking, now, actorId);
  const cancelState = canCancel(booking, now, actorId);

  const runCheckIn = async () => {
    try {
      await checkIn.mutateAsync(booking.id);
      onFeedback({ type: 'success', text: `You're checked in to "${booking.title}".` });
    } catch (error) {
      onFeedback({ type: 'error', text: toAppError(error).message });
    }
  };

  const runCancel = async () => {
    setConfirming(false);
    try {
      await cancel.mutateAsync(booking.id);
      onFeedback({ type: 'success', text: `"${booking.title}" was cancelled.` });
    } catch (error) {
      onFeedback({ type: 'error', text: toAppError(error).message });
    }
  };

  if (confirming) {
    return (
      <View style={styles.confirm} testID={`cancel-confirm-${booking.id}`}>
        <Text style={styles.confirmText}>Cancel &quot;{booking.title}&quot;? This frees the room for others.</Text>
        <View style={styles.row}>
          <Button
            title="Keep meeting"
            variant="secondary"
            onPress={() => setConfirming(false)}
            testID={`cancel-keep-${booking.id}`}
            style={styles.flex}
          />
          <Button
            title="Yes, cancel"
            variant="danger"
            onPress={() => void runCancel()}
            testID={`cancel-confirm-yes-${booking.id}`}
            style={styles.flex}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Button
          title={booking.status === 'CHECKED_IN' ? 'Checked in ✓' : 'Check in'}
          onPress={() => void runCheckIn()}
          disabled={!checkInState.allowed}
          loading={checkIn.isPending}
          testID={`check-in-${booking.id}`}
          style={styles.flex}
        />
        <Button
          title="Cancel meeting"
          variant="secondary"
          onPress={() => setConfirming(true)}
          disabled={!cancelState.allowed}
          loading={cancel.isPending}
          testID={`cancel-${booking.id}`}
          style={styles.flex}
        />
      </View>
      {!checkInState.allowed && checkInState.reason ? (
        <Text style={styles.reason} testID={`check-in-reason-${booking.id}`}>
          {checkInState.reason}
        </Text>
      ) : null}
      {!cancelState.allowed && cancelState.reason ? (
        <Text style={styles.reason} testID={`cancel-reason-${booking.id}`}>
          {cancelState.reason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  reason: { color: colors.textMuted, fontSize: 12 },
  confirm: { gap: spacing.sm, marginTop: spacing.sm },
  confirmText: { color: colors.text, fontSize: 14 },
});
