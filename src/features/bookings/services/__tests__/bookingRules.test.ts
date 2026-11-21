import { createBookingFormSchema } from '@/features/bookings/services/bookingSchema';
import { findConflict } from '@/features/bookings/services/bookingRules';
import { bookingSchema, canTransition, type Booking } from '@/features/bookings/types/booking';
import { combineDateAndTime } from '@/shared/utils/dateTime';

const DATE = '2026-11-21';
const NOW = new Date(combineDateAndTime(DATE, '08:00'));
const schema = createBookingFormSchema(() => NOW);

const valid = {
  title: 'Sprint planning',
  date: DATE,
  startTime: '09:00',
  endTime: '10:00',
  participantIds: ['emp-2'],
};

function errorsFor(values: Partial<typeof valid>) {
  const result = schema.safeParse({ ...valid, ...values });
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe('booking form schema', () => {
  it('accepts valid values', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('requires a non-blank title', () => {
    expect(errorsFor({ title: '   ' }).title).toMatch(/required/i);
  });

  it('rejects an invalid date or time format', () => {
    expect(errorsFor({ date: '2026-02-31' }).date).toBeDefined();
    expect(errorsFor({ startTime: '9am' }).startTime).toBeDefined();
    expect(errorsFor({ endTime: '' }).endTime).toBeDefined();
  });

  it('rejects an end time that is not after the start time', () => {
    expect(errorsFor({ startTime: '10:00', endTime: '09:00' }).endTime).toMatch(/later/i);
    expect(errorsFor({ startTime: '10:00', endTime: '10:00' }).endTime).toMatch(/later/i);
  });

  it('rejects a start time in the past', () => {
    expect(errorsFor({ startTime: '07:00', endTime: '07:30' }).startTime).toMatch(/past/i);
    expect(errorsFor({ date: '2026-11-20' }).startTime).toMatch(/past/i);
  });

  it('rejects duplicate participant identifiers', () => {
    expect(errorsFor({ participantIds: ['emp-2', 'emp-2'] }).participantIds).toBeDefined();
  });
});

describe('booking domain validation', () => {
  const booking: Booking = {
    id: 'b1',
    roomId: 'room-1',
    roomName: 'Alpha',
    ownerId: 'emp-1',
    title: 'Planning',
    startTime: combineDateAndTime(DATE, '10:00'),
    endTime: combineDateAndTime(DATE, '11:00'),
    participantIds: [],
    status: 'UPCOMING',
  };

  it('requires ISO-8601 values with an offset and a positive duration', () => {
    expect(bookingSchema.safeParse(booking).success).toBe(true);
    expect(bookingSchema.safeParse({ ...booking, startTime: '2026-11-21T10:00:00' }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, endTime: booking.startTime }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...booking, title: ' ' }).success).toBe(false);
  });

  it('only allows the documented status transitions', () => {
    expect(canTransition('UPCOMING', 'CHECKED_IN')).toBe(true);
    expect(canTransition('UPCOMING', 'CANCELLED')).toBe(true);
    expect(canTransition('CHECKED_IN', 'PAST')).toBe(true);
    expect(canTransition('CANCELLED', 'UPCOMING')).toBe(false);
    expect(canTransition('PAST', 'CANCELLED')).toBe(false);
  });

  it('flags overlaps and permits adjacent ranges', () => {
    const overlap = { startTime: combineDateAndTime(DATE, '10:30'), endTime: combineDateAndTime(DATE, '11:30') };
    const adjacent = { startTime: combineDateAndTime(DATE, '11:00'), endTime: combineDateAndTime(DATE, '12:00') };
    expect(findConflict([booking], 'room-1', overlap)).not.toBeNull();
    expect(findConflict([booking], 'room-1', adjacent)).toBeNull();
  });
});
