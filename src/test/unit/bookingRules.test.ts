import {
  buildDaySlots,
  deriveAvailableSlots,
  findConflict,
  rangesOverlap,
  resolveBookingStatus,
  validateBookingTimes,
} from '@/features/bookings/services/bookingRules';
import type { Booking } from '@/features/bookings/types/booking';
import { combineDateAndTime, parseIso } from '@/shared/utils/dateTime';

const DATE = '2026-11-21';
const at = (time: string, date = DATE) => combineDateAndTime(date, time);
const NOW = new Date(at('08:00'));

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    roomId: 'room-1',
    roomName: 'Alpha',
    ownerId: 'e1',
    title: 'Planning',
    startTime: at('10:00'),
    endTime: at('11:00'),
    participantIds: [],
    status: 'UPCOMING',
    ...overrides,
  };
}

const range = (start: string, end: string) => ({ startTime: at(start), endTime: at(end) });

describe('rangesOverlap', () => {
  const r = (s: string, e: string) => ({
    startMs: parseIso(at(s)) as number,
    endMs: parseIso(at(e)) as number,
  });

  it('detects partial, containing and identical overlaps', () => {
    expect(rangesOverlap(r('10:00', '11:00'), r('10:30', '11:30'))).toBe(true);
    expect(rangesOverlap(r('10:00', '12:00'), r('10:30', '11:00'))).toBe(true);
    expect(rangesOverlap(r('10:00', '11:00'), r('10:00', '11:00'))).toBe(true);
  });

  it('treats adjacent boundaries as non-overlapping in both directions', () => {
    expect(rangesOverlap(r('09:00', '10:00'), r('10:00', '11:00'))).toBe(false);
    expect(rangesOverlap(r('10:00', '11:00'), r('09:00', '10:00'))).toBe(false);
  });

  it('does not overlap disjoint ranges', () => {
    expect(rangesOverlap(r('08:00', '09:00'), r('10:00', '11:00'))).toBe(false);
  });
});

describe('validateBookingTimes', () => {
  it('accepts a valid future range', () => {
    expect(validateBookingTimes(range('09:00', '10:00'), NOW)).toEqual([]);
  });

  it('rejects an end earlier than the start', () => {
    const errors = validateBookingTimes(range('10:00', '09:00'), NOW);
    expect(errors.map((e) => e.code)).toContain('END_NOT_AFTER_START');
  });

  it('rejects an end equal to the start', () => {
    const errors = validateBookingTimes(range('10:00', '10:00'), NOW);
    expect(errors.map((e) => e.code)).toContain('END_NOT_AFTER_START');
  });

  it('rejects a start in the past', () => {
    const errors = validateBookingTimes(range('07:00', '07:30'), NOW);
    expect(errors.map((e) => e.code)).toContain('START_IN_PAST');
  });

  it('accepts a start exactly at the current time', () => {
    expect(validateBookingTimes(range('08:00', '08:30'), NOW)).toEqual([]);
  });

  it('rejects malformed or offset-less date-times', () => {
    const errors = validateBookingTimes({ startTime: '2026-11-21 09:00', endTime: 'nope' }, NOW);
    expect(errors.map((e) => e.code)).toEqual(['INVALID_START', 'INVALID_END']);
  });
});

describe('findConflict', () => {
  const existing = [makeBooking()];

  it('finds an overlap in the same room', () => {
    expect(findConflict(existing, 'room-1', range('10:30', '11:30'))?.id).toBe('b1');
  });

  it('allows ranges that touch the boundaries', () => {
    expect(findConflict(existing, 'room-1', range('09:00', '10:00'))).toBeNull();
    expect(findConflict(existing, 'room-1', range('11:00', '12:00'))).toBeNull();
  });

  it('ignores other rooms', () => {
    expect(findConflict(existing, 'room-2', range('10:00', '11:00'))).toBeNull();
  });

  it('ignores cancelled bookings', () => {
    const cancelled = [makeBooking({ status: 'CANCELLED' })];
    expect(findConflict(cancelled, 'room-1', range('10:00', '11:00'))).toBeNull();
  });

  it('treats checked-in bookings as blocking', () => {
    const checkedIn = [makeBooking({ status: 'CHECKED_IN' })];
    expect(findConflict(checkedIn, 'room-1', range('10:00', '10:30'))).not.toBeNull();
  });

  it('can exclude the booking being edited', () => {
    expect(findConflict(existing, 'room-1', range('10:00', '11:00'), { ignoreBookingId: 'b1' })).toBeNull();
  });

  it('only lets one of several concurrent identical attempts succeed when applied sequentially', () => {
    const store: Booking[] = [];
    const attempts = Array.from({ length: 5 }, (_, i) => ({ id: `attempt-${i}`, ...range('13:00', '14:00') }));
    let accepted = 0;
    for (const attempt of attempts) {
      if (!findConflict(store, 'room-1', attempt)) {
        store.push(makeBooking({ id: attempt.id, startTime: attempt.startTime, endTime: attempt.endTime }));
        accepted += 1;
      }
    }
    expect(accepted).toBe(1);
  });
});

describe('resolveBookingStatus', () => {
  it('turns ended upcoming and checked-in bookings into PAST', () => {
    const later = new Date(at('12:00'));
    expect(resolveBookingStatus(makeBooking(), later)).toBe('PAST');
    expect(resolveBookingStatus(makeBooking({ status: 'CHECKED_IN' }), later)).toBe('PAST');
  });

  it('keeps cancelled bookings cancelled and running meetings active', () => {
    expect(resolveBookingStatus(makeBooking({ status: 'CANCELLED' }), new Date(at('12:00')))).toBe('CANCELLED');
    expect(resolveBookingStatus(makeBooking(), new Date(at('10:30')))).toBe('UPCOMING');
  });
});

describe('buildDaySlots', () => {
  it('builds 30-minute slots and marks booked, past and available periods', () => {
    const slots = buildDaySlots(DATE, [makeBooking()], new Date(at('09:00')));
    const byStart = new Map(slots.map((s) => [s.startTime, s.state]));
    expect(byStart.get(at('07:00'))).toBe('PAST');
    expect(byStart.get(at('08:30'))).toBe('PAST');
    expect(byStart.get(at('09:00'))).toBe('AVAILABLE');
    expect(byStart.get(at('10:00'))).toBe('BOOKED');
    expect(byStart.get(at('10:30'))).toBe('BOOKED');
    expect(byStart.get(at('11:00'))).toBe('AVAILABLE');
    expect(slots).toHaveLength(28);
  });

  it('keeps the slot adjacent to a booking selectable', () => {
    const available = deriveAvailableSlots(DATE, [makeBooking()], NOW).map((s) => s.startTime);
    expect(available).toContain(at('09:30'));
    expect(available).toContain(at('11:00'));
    expect(available).not.toContain(at('10:00'));
  });

  it('does not block slots for cancelled bookings', () => {
    const slots = buildDaySlots(DATE, [makeBooking({ status: 'CANCELLED' })], NOW);
    expect(slots.find((s) => s.startTime === at('10:00'))?.state).toBe('AVAILABLE');
  });
});
