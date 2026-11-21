import {
  applyCancellation,
  applyCheckIn,
  canCancel,
  canCheckIn,
} from '@/features/bookings/services/meetingActions';
import type { Booking } from '@/features/bookings/types/booking';
import { AppError } from '@/shared/api/types';
import { combineDateAndTime } from '@/shared/utils/dateTime';

const DATE = '2026-11-21';
const at = (time: string) => new Date(combineDateAndTime(DATE, time));

const booking: Booking = {
  id: 'b1',
  roomId: 'room-1',
  roomName: 'Alpha',
  ownerId: 'emp-1',
  title: 'Standup',
  startTime: combineDateAndTime(DATE, '10:00'),
  endTime: combineDateAndTime(DATE, '11:00'),
  participantIds: [],
  status: 'UPCOMING',
};

describe('check-in eligibility', () => {
  it('is closed more than 15 minutes before the start', () => {
    const result = canCheckIn(booking, at('09:44'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/opens/i);
  });

  it('opens exactly 15 minutes before the start', () => {
    expect(canCheckIn(booking, at('09:45')).allowed).toBe(true);
  });

  it('remains open until exactly 15 minutes after the start', () => {
    expect(canCheckIn(booking, at('10:15')).allowed).toBe(true);
    const late = canCheckIn(booking, new Date(at('10:15').getTime() + 1000));
    expect(late.allowed).toBe(false);
    expect(late.reason).toMatch(/closed/i);
  });

  it('is not allowed twice, after cancellation, or after the meeting ended', () => {
    expect(canCheckIn({ ...booking, status: 'CHECKED_IN' }, at('10:00')).reason).toMatch(/already/i);
    expect(canCheckIn({ ...booking, status: 'CANCELLED' }, at('10:00')).allowed).toBe(false);
    expect(canCheckIn(booking, at('11:30')).reason).toMatch(/ended/i);
  });

  it('is denied to employees other than the organizer', () => {
    const result = canCheckIn(booking, at('10:00'), 'emp-2');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/organizer/i);
  });
});

describe('cancellation eligibility', () => {
  it('is allowed before the start', () => {
    expect(canCancel(booking, at('09:59')).allowed).toBe(true);
  });

  it('is denied once the meeting has started', () => {
    expect(canCancel(booking, at('10:00')).allowed).toBe(false);
    expect(canCancel(booking, at('10:30')).reason).toMatch(/started/i);
  });

  it('is denied for checked-in, cancelled and past meetings', () => {
    expect(canCancel({ ...booking, status: 'CHECKED_IN' }, at('09:50')).allowed).toBe(false);
    expect(canCancel({ ...booking, status: 'CANCELLED' }, at('09:00')).allowed).toBe(false);
    expect(canCancel(booking, at('12:00')).allowed).toBe(false);
  });

  it('is denied to employees other than the organizer', () => {
    expect(canCancel(booking, at('09:00'), 'emp-2').allowed).toBe(false);
  });
});

describe('state transitions', () => {
  it('moves UPCOMING to CHECKED_IN inside the window', () => {
    expect(applyCheckIn(booking, at('10:00'), 'emp-1').status).toBe('CHECKED_IN');
  });

  it('moves UPCOMING to CANCELLED before the start', () => {
    expect(applyCancellation(booking, at('09:00'), 'emp-1').status).toBe('CANCELLED');
  });

  it('does not mutate the original booking', () => {
    applyCheckIn(booking, at('10:00'));
    expect(booking.status).toBe('UPCOMING');
  });

  it('throws a normalized error outside the check-in window', () => {
    expect(() => applyCheckIn(booking, at('08:00'))).toThrow(AppError);
    try {
      applyCheckIn(booking, at('08:00'));
    } catch (error) {
      expect((error as AppError).code).toBe('CHECK_IN_WINDOW_CLOSED');
    }
  });

  it('throws FORBIDDEN for a non-owner', () => {
    try {
      applyCancellation(booking, at('09:00'), 'emp-9');
      throw new Error('expected failure');
    } catch (error) {
      expect((error as AppError).code).toBe('FORBIDDEN');
    }
  });

  it('throws INVALID_STATE for repeated or illegal transitions', () => {
    const checkedIn = applyCheckIn(booking, at('10:00'));
    try {
      applyCheckIn(checkedIn, at('10:05'));
      throw new Error('expected failure');
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_STATE');
    }
    try {
      applyCancellation({ ...booking, status: 'CANCELLED' }, at('09:00'));
      throw new Error('expected failure');
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_STATE');
    }
  });
});
