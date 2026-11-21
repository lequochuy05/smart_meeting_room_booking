import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { MeetingActions, type ActionFeedback } from '@/features/bookings/components/MeetingActions';
import { useMyBookings } from '@/features/bookings/hooks/useMyBookings';
import { resolveBookingStatus } from '@/features/bookings/services/bookingRules';
import type { Booking, BookingStatus } from '@/features/bookings/types/booking';
import { QueryStateView } from '@/shared/components/QueryStateView';
import { Chip } from '@/shared/components/Chip';
import { colors, radius, spacing } from '@/shared/components/theme';
import { useNow } from '@/shared/hooks/useNow';
import type { MeetingListStatus } from '@/shared/api/types';
import { COMPANY_TIMEZONE_LABEL, formatCompanyRange } from '@/shared/utils/dateTime';

const STATUS_LABELS: Record<BookingStatus, string> = {
  UPCOMING: 'Upcoming',
  CHECKED_IN: 'Checked in',
  CANCELLED: 'Cancelled',
  PAST: 'Past',
};

interface MyBookingsScreenProps {
  currentEmployeeId?: string;
}

export function MyBookingsScreen({ currentEmployeeId }: MyBookingsScreenProps) {
  const [segment, setSegment] = useState<MeetingListStatus>('upcoming');
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const query = useMyBookings(segment);
  const now = useNow();

  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        <Chip
          label="Upcoming"
          selected={segment === 'upcoming'}
          onPress={() => {
            setFeedback(null);
            setSegment('upcoming');
          }}
          testID="segment-upcoming"
        />
        <Chip
          label="Past"
          selected={segment === 'past'}
          onPress={() => {
            setFeedback(null);
            setSegment('past');
          }}
          testID="segment-past"
        />
      </View>
      <Text style={styles.timezone} testID="bookings-timezone">
        Times shown in {COMPANY_TIMEZONE_LABEL}
      </Text>
      {feedback ? (
        <View
          style={[styles.feedback, feedback.type === 'success' ? styles.success : styles.failure]}
          testID="action-feedback"
          accessibilityRole="alert"
        >
          <Text style={feedback.type === 'success' ? styles.successText : styles.failureText}>{feedback.text}</Text>
        </View>
      ) : null}
      <View style={styles.list}>
        <QueryStateView
          query={query}
          isEmpty={(data) => data.length === 0}
          empty={{
            title: segment === 'upcoming' ? 'No upcoming meetings' : 'No past meetings',
            message:
              segment === 'upcoming' ? 'Book a room from the Rooms tab and it will show up here.' : 'Finished and cancelled meetings appear here.',
          }}
          loadingMessage="Loading meetings…"
          errorTitle="Couldn't load your meetings"
        >
          {(data) => (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.content}
              testID="meeting-list"
              renderItem={({ item }) => (
                <MeetingCard
                  booking={item}
                  now={now}
                  actorId={currentEmployeeId}
                  showActions={segment === 'upcoming'}
                  onFeedback={setFeedback}
                />
              )}
            />
          )}
        </QueryStateView>
      </View>
    </View>
  );
}

function MeetingCard({
  booking,
  now,
  actorId,
  showActions,
  onFeedback,
}: {
  booking: Booking;
  now: Date;
  actorId?: string;
  showActions: boolean;
  onFeedback: (feedback: ActionFeedback) => void;
}) {
  const status = resolveBookingStatus(booking, now);
  return (
    <View style={styles.card} testID={`meeting-${booking.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{booking.title}</Text>
        <Text style={[styles.badge, status === 'CANCELLED' && styles.badgeCancelled]}>{STATUS_LABELS[status]}</Text>
      </View>
      <Text style={styles.meta}>{booking.roomName}</Text>
      <Text style={styles.meta}>{formatCompanyRange(booking.startTime, booking.endTime)}</Text>
      {booking.participantIds.length > 0 ? (
        <Text style={styles.meta}>{booking.participantIds.length} participant(s)</Text>
      ) : null}
      {showActions ? <MeetingActions booking={booking} now={now} actorId={actorId} onFeedback={onFeedback} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  segments: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.xs },
  timezone: { color: colors.textMuted, fontSize: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  list: { flex: 1 },
  content: { padding: spacing.md },
  feedback: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.md },
  success: { backgroundColor: colors.successSoft },
  failure: { backgroundColor: colors.dangerSoft },
  successText: { color: colors.success, fontWeight: '600' },
  failureText: { color: colors.danger, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  badgeCancelled: { color: colors.danger },
  meta: { color: colors.textMuted, fontSize: 14 },
});
