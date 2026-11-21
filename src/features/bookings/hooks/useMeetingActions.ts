import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelMeeting, checkInToMeeting } from '@/features/bookings/services/bookingService';
import { queryKeys } from '@/shared/api/queryClient';

/** Check-in and cancellation; successful mutations refresh schedules and My Meetings. */
export function useMeetingActions() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.schedules() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() }),
    ]);
  };
  const checkIn = useMutation({ mutationFn: (bookingId: string) => checkInToMeeting(bookingId), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: (bookingId: string) => cancelMeeting(bookingId), onSuccess: refresh });
  return { checkIn, cancel };
}
