import type { Booking, BookingStatus } from '@/features/bookings/types/booking';
import {
  MINUTE_MS,
  SLOT_MINUTES,
  combineDateAndTime,
  getDayBounds,
  isValidIso,
  parseIso,
  toCompanyIso,
} from '@/shared/utils/dateTime';

export interface TimeRange {
  startMs: number;
  endMs: number;
}

export interface TimeRangeInput {
  startTime: string;
  endTime: string;
}

export type TimeRangeErrorCode = 'INVALID_START' | 'INVALID_END' | 'END_NOT_AFTER_START' | 'START_IN_PAST';

export interface TimeRangeError {
  code: TimeRangeErrorCode;
  field: 'startTime' | 'endTime';
  message: string;
}

/** Hours of the day displayed on the room timeline. */
export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 21;

/**
 * Half-open interval overlap: `[aStart, aEnd)` and `[bStart, bEnd)` overlap only
 * when each starts strictly before the other ends. Ranges that merely touch at a
 * boundary (10:00 end, 10:00 start) do NOT overlap.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function toTimeRange(input: TimeRangeInput): TimeRange | null {
  const startMs = parseIso(input.startTime);
  const endMs = parseIso(input.endTime);
  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}

/** Bookings that still reserve the room. Cancelled bookings never block. */
export function isBlockingBooking(booking: Pick<Booking, 'status'>): boolean {
  return booking.status !== 'CANCELLED';
}

export function validateBookingTimes(input: TimeRangeInput, now: Date): TimeRangeError[] {
  const errors: TimeRangeError[] = [];
  const startMs = isValidIso(input.startTime) ? (parseIso(input.startTime) as number) : null;
  const endMs = isValidIso(input.endTime) ? (parseIso(input.endTime) as number) : null;

  if (startMs === null) {
    errors.push({ code: 'INVALID_START', field: 'startTime', message: 'Enter a valid start time' });
  }
  if (endMs === null) {
    errors.push({ code: 'INVALID_END', field: 'endTime', message: 'Enter a valid end time' });
  }
  if (startMs === null || endMs === null) return errors;

  if (endMs <= startMs) {
    errors.push({
      code: 'END_NOT_AFTER_START',
      field: 'endTime',
      message: 'End time must be later than the start time',
    });
  }
  if (startMs < now.getTime()) {
    errors.push({ code: 'START_IN_PAST', field: 'startTime', message: 'Start time cannot be in the past' });
  }
  return errors;
}

/** Returns the first active booking in the same room that overlaps the range. */
export function findConflict(
  bookings: readonly Booking[],
  roomId: string,
  range: TimeRangeInput,
  options: { ignoreBookingId?: string } = {},
): Booking | null {
  const candidate = toTimeRange(range);
  if (!candidate) return null;
  for (const booking of bookings) {
    if (booking.roomId !== roomId || booking.id === options.ignoreBookingId) continue;
    if (!isBlockingBooking(booking)) continue;
    const existing = toTimeRange(booking);
    if (existing && rangesOverlap(candidate, existing)) return booking;
  }
  return null;
}

/** Marks UPCOMING/CHECKED_IN bookings whose end time passed as PAST. */
export function resolveBookingStatus(booking: Pick<Booking, 'status' | 'endTime'>, now: Date): BookingStatus {
  if (booking.status === 'UPCOMING' || booking.status === 'CHECKED_IN') {
    const endMs = parseIso(booking.endTime);
    if (endMs !== null && endMs <= now.getTime()) return 'PAST';
  }
  return booking.status;
}

export type SlotState = 'AVAILABLE' | 'BOOKED' | 'PAST';

export interface DaySlot {
  startTime: string;
  endTime: string;
  state: SlotState;
  /** Booking occupying the slot, when state is `BOOKED`. */
  booking?: Booking;
}

/** Builds fixed 30-minute slots for the room timeline of a company-timezone date. */
export function buildDaySlots(
  date: string,
  bookings: readonly Booking[],
  now: Date,
  options: { startHour?: number; endHour?: number } = {},
): DaySlot[] {
  const startHour = options.startHour ?? TIMELINE_START_HOUR;
  const endHour = options.endHour ?? TIMELINE_END_HOUR;
  const { startMs: dayStartMs, endMs: dayEndMs } = getDayBounds(date);
  const first = parseIso(combineDateAndTime(date, `${String(startHour).padStart(2, '0')}:00`)) as number;
  const lastExclusive = Math.min(
    endHour >= 24 ? dayEndMs : (parseIso(combineDateAndTime(date, `${String(endHour).padStart(2, '0')}:00`)) as number),
    dayEndMs,
  );
  const blocking = bookings.filter(isBlockingBooking);
  const slots: DaySlot[] = [];

  for (let slotStart = Math.max(first, dayStartMs); slotStart < lastExclusive; slotStart += SLOT_MINUTES * MINUTE_MS) {
    const slotEnd = slotStart + SLOT_MINUTES * MINUTE_MS;
    const range: TimeRange = { startMs: slotStart, endMs: slotEnd };
    const occupying = blocking.find((booking) => {
      const bookedRange = toTimeRange(booking);
      return bookedRange ? rangesOverlap(range, bookedRange) : false;
    });
    const state: SlotState = occupying ? 'BOOKED' : slotEnd <= now.getTime() ? 'PAST' : 'AVAILABLE';
    slots.push({
      startTime: toCompanyIso(slotStart),
      endTime: toCompanyIso(slotEnd),
      state,
      booking: occupying,
    });
  }
  return slots;
}

/** Slots that are free and still in the future, expressed in ISO-8601. */
export function deriveAvailableSlots(
  date: string,
  bookings: readonly Booking[],
  now: Date,
): { startTime: string; endTime: string }[] {
  return buildDaySlots(date, bookings, now)
    .filter((slot) => slot.state === 'AVAILABLE')
    .map(({ startTime, endTime }) => ({ startTime, endTime }));
}
