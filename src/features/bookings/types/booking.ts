import { z } from 'zod';

import { isValidIso, parseIso } from '@/shared/utils/dateTime';

export const BOOKING_STATUSES = ['UPCOMING', 'CHECKED_IN', 'CANCELLED', 'PAST'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: string;
  roomId: string;
  /** Denormalised room name for display in meeting lists. */
  roomName: string;
  ownerId: string;
  title: string;
  /** ISO-8601 date-time with timezone offset. */
  startTime: string;
  /** ISO-8601 date-time with timezone offset. */
  endTime: string;
  participantIds: string[];
  status: BookingStatus;
}

export interface CreateBookingInput {
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
}

/** Allowed booking status transitions from data-model.md. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  UPCOMING: ['CHECKED_IN', 'CANCELLED', 'PAST'],
  CHECKED_IN: ['CANCELLED', 'PAST'],
  CANCELLED: [],
  PAST: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

const isoDateTime = z.string().refine(isValidIso, 'Must be an ISO-8601 date-time with a timezone offset');

/** Structural validation of a booking received from an adapter. */
export const bookingSchema = z
  .object({
    id: z.string().min(1),
    roomId: z.string().min(1),
    roomName: z.string(),
    ownerId: z.string().min(1),
    title: z.string().trim().min(1, 'Title is required'),
    startTime: isoDateTime,
    endTime: isoDateTime,
    participantIds: z.array(z.string().min(1)),
    status: z.enum(BOOKING_STATUSES),
  })
  .refine((b) => (parseIso(b.endTime) as number) > (parseIso(b.startTime) as number), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
