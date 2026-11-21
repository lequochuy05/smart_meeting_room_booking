import { z } from 'zod';

import { findConflict, validateBookingTimes } from '@/features/bookings/services/bookingRules';
import { bookingSchema, type Booking, type CreateBookingInput } from '@/features/bookings/types/booking';
import { getApiAdapter } from '@/shared/api';
import { AppError, type MeetingListStatus } from '@/shared/api/types';
import { now as clockNow } from '@/shared/utils/clock';
import { toCompanyDate } from '@/shared/utils/dateTime';

/** Booked periods of a room on a company-timezone date, read from the authoritative adapter. */
export async function fetchRoomSchedule(roomId: string, date: string) {
  const schedule = await getApiAdapter().getRoomSchedule(roomId, date);
  return {
    roomId: schedule.roomId,
    date: schedule.date,
    bookings: z.array(bookingSchema).parse(schedule.bookings),
    availableSlots: schedule.availableSlots,
  };
}

export async function fetchMyBookings(status: MeetingListStatus): Promise<Booking[]> {
  return z.array(bookingSchema).parse(await getApiAdapter().listMyBookings(status));
}

/**
 * Creates a booking. The client validates the time range, then loads FRESH room
 * availability (never the query cache) so stale results cannot authorize a
 * submission, and finally the adapter/server revalidates authoritatively.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const timeErrors = validateBookingTimes(input, clockNow());
  if (timeErrors.length > 0) {
    const pastOnly = timeErrors.every((error) => error.code === 'START_IN_PAST');
    throw new AppError(pastOnly ? 'PAST_TIME' : 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fieldErrors: Object.fromEntries(timeErrors.map((error) => [error.field, error.message])),
    });
  }

  const fresh = await fetchRoomSchedule(input.roomId, toCompanyDate(input.startTime));
  const conflict = findConflict(fresh.bookings, input.roomId, input);
  if (conflict) {
    throw new AppError('BOOKING_CONFLICT', 'This room was just booked for part of that time. Choose another time.', {
      status: 409,
    });
  }

  return bookingSchema.parse(await getApiAdapter().createBooking(input));
}

export async function checkInToMeeting(bookingId: string): Promise<Booking> {
  return bookingSchema.parse(await getApiAdapter().checkIn(bookingId));
}

export async function cancelMeeting(bookingId: string): Promise<Booking> {
  return bookingSchema.parse(await getApiAdapter().cancelBooking(bookingId));
}
