import { useQuery } from '@tanstack/react-query';

import { fetchRoomSchedule } from '@/features/bookings/services/bookingService';
import { queryKeys } from '@/shared/api/queryClient';
import { isValidDateString } from '@/shared/utils/dateTime';

/** Bookings of a room on a date; shares its cache key with the room schedule. */
export function useRoomBookings(roomId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.rooms.schedule(roomId, date),
    queryFn: () => fetchRoomSchedule(roomId, date),
    enabled: isValidDateString(date),
  });
}
