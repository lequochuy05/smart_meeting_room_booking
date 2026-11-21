import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBooking } from '@/features/bookings/services/bookingService';
import type { CreateBookingInput } from '@/features/bookings/types/booking';
import { queryKeys } from '@/shared/api/queryClient';
import { isAppError } from '@/shared/api/types';
import { toCompanyDate } from '@/shared/utils/dateTime';

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    // Caches change only after the adapter confirms success.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.schedules() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
      ]);
    },
    // A conflict means our view of the room is stale: refresh it immediately.
    onError: async (error, input) => {
      if (isAppError(error) && error.code === 'BOOKING_CONFLICT') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.rooms.schedule(input.roomId, toCompanyDate(input.startTime)),
        });
      }
    },
  });
}
