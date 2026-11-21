import { resolveBookingStatus } from '@/features/bookings/services/bookingRules';
import { canTransition, type Booking } from '@/features/bookings/types/booking';
import { AppError } from '@/shared/api/types';
import { MINUTE_MS, parseIso } from '@/shared/utils/dateTime';

export const CHECK_IN_OPENS_MINUTES_BEFORE_START = 15;
export const CHECK_IN_CLOSES_MINUTES_AFTER_START = 15;

export interface ActionEligibility {
  allowed: boolean;
  /** Employee-facing explanation when the action is not allowed. */
  reason?: string;
}

const allowed = (): ActionEligibility => ({ allowed: true });
const denied = (reason: string): ActionEligibility => ({ allowed: false, reason });

function checkOwner(booking: Booking, actorId: string | undefined, verb: string): ActionEligibility | null {
  if (actorId !== undefined && booking.ownerId !== actorId) {
    return denied(`Only the meeting organizer can ${verb} this meeting.`);
  }
  return null;
}

export function getCheckInWindow(booking: Pick<Booking, 'startTime'>): { opensMs: number; closesMs: number } {
  const startMs = parseIso(booking.startTime) as number;
  return {
    opensMs: startMs - CHECK_IN_OPENS_MINUTES_BEFORE_START * MINUTE_MS,
    closesMs: startMs + CHECK_IN_CLOSES_MINUTES_AFTER_START * MINUTE_MS,
  };
}

/** Check-in requires `UPCOMING` and now within [start − 15 min, start + 15 min]. */
export function canCheckIn(booking: Booking, now: Date, actorId?: string): ActionEligibility {
  const ownerDenied = checkOwner(booking, actorId, 'check in to');
  if (ownerDenied) return ownerDenied;

  const status = resolveBookingStatus(booking, now);
  if (status === 'CHECKED_IN') return denied('You have already checked in.');
  if (status === 'CANCELLED') return denied('This meeting was cancelled.');
  if (status === 'PAST') return denied('This meeting has already ended.');

  const { opensMs, closesMs } = getCheckInWindow(booking);
  const nowMs = now.getTime();
  if (nowMs < opensMs) {
    return denied(`Check-in opens ${CHECK_IN_OPENS_MINUTES_BEFORE_START} minutes before the meeting starts.`);
  }
  if (nowMs > closesMs) {
    return denied(`Check-in closed ${CHECK_IN_CLOSES_MINUTES_AFTER_START} minutes after the meeting started.`);
  }
  return allowed();
}

/** Cancellation requires `UPCOMING` and a start time that has not been reached. */
export function canCancel(booking: Booking, now: Date, actorId?: string): ActionEligibility {
  const ownerDenied = checkOwner(booking, actorId, 'cancel');
  if (ownerDenied) return ownerDenied;

  const status = resolveBookingStatus(booking, now);
  if (status === 'CANCELLED') return denied('This meeting is already cancelled.');
  if (status === 'PAST') return denied('This meeting has already ended.');
  if (status === 'CHECKED_IN') return denied('A meeting that has been checked in cannot be cancelled.');
  if (now.getTime() >= (parseIso(booking.startTime) as number)) {
    return denied('The meeting has already started and can no longer be cancelled.');
  }
  return allowed();
}

/** Authoritative state transition for check-in (used by the adapter). */
export function applyCheckIn(booking: Booking, now: Date, actorId?: string): Booking {
  const eligibility = canCheckIn(booking, now, actorId);
  if (!eligibility.allowed) {
    throw new AppError(errorCodeFor(booking, now, actorId, 'CHECK_IN_WINDOW_CLOSED'), eligibility.reason as string, {
      status: actorId !== undefined && booking.ownerId !== actorId ? 403 : 409,
    });
  }
  if (!canTransition(booking.status, 'CHECKED_IN')) {
    throw new AppError('INVALID_STATE', 'This meeting cannot be checked in.', { status: 409 });
  }
  return { ...booking, status: 'CHECKED_IN' };
}

/** Authoritative state transition for cancellation (used by the adapter). */
export function applyCancellation(booking: Booking, now: Date, actorId?: string): Booking {
  const eligibility = canCancel(booking, now, actorId);
  if (!eligibility.allowed) {
    throw new AppError(
      errorCodeFor(booking, now, actorId, 'CANCELLATION_NOT_ALLOWED'),
      eligibility.reason as string,
      { status: actorId !== undefined && booking.ownerId !== actorId ? 403 : 409 },
    );
  }
  if (!canTransition(booking.status, 'CANCELLED')) {
    throw new AppError('INVALID_STATE', 'This meeting cannot be cancelled.', { status: 409 });
  }
  return { ...booking, status: 'CANCELLED' };
}

function errorCodeFor(
  booking: Booking,
  now: Date,
  actorId: string | undefined,
  fallback: 'CHECK_IN_WINDOW_CLOSED' | 'CANCELLATION_NOT_ALLOWED',
) {
  if (actorId !== undefined && booking.ownerId !== actorId) return 'FORBIDDEN' as const;
  const status = resolveBookingStatus(booking, now);
  if (status === 'CHECKED_IN' || status === 'CANCELLED' || status === 'PAST') return 'INVALID_STATE' as const;
  return fallback;
}
