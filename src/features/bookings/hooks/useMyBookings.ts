import { useQuery } from '@tanstack/react-query';

import { fetchMyBookings } from '@/features/bookings/services/bookingService';
import type { Booking } from '@/features/bookings/types/booking';
import { queryKeys } from '@/shared/api/queryClient';
import type { MeetingListStatus } from '@/shared/api/types';
import { parseIso } from '@/shared/utils/dateTime';

const startMs = (booking: Booking) => parseIso(booking.startTime) as number;

/** Upcoming meetings ascend by start time; past meetings descend (most recent first). */
export function sortMeetings(bookings: readonly Booking[], status: MeetingListStatus): Booking[] {
  const sorted = [...bookings].sort((a, b) => startMs(a) - startMs(b));
  return status === 'upcoming' ? sorted : sorted.reverse();
}

export function useMyBookings(status: MeetingListStatus) {
  return useQuery({
    queryKey: queryKeys.bookings.mine(status),
    queryFn: () => fetchMyBookings(status),
    select: (bookings) => sortMeetings(bookings, status),
  });
}
