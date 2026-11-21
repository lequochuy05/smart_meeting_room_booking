import { z } from 'zod';

import { validateBookingTimes } from '@/features/bookings/services/bookingRules';
import {
  combineDateAndTime,
  isValidDateString,
  isValidTimeString,
} from '@/shared/utils/dateTime';
import { now as clockNow } from '@/shared/utils/clock';

export interface BookingFormValues {
  title: string;
  /** `YYYY-MM-DD` company date. */
  date: string;
  /** `HH:mm` company time. */
  startTime: string;
  endTime: string;
  /** Employee directory identifiers. */
  participantIds: string[];
}

export const MAX_TITLE_LENGTH = 120;

/**
 * Builds the Zod schema for the booking form. `now` is injected so past-time
 * validation is deterministic in tests.
 */
export function createBookingFormSchema(getNow: () => Date = clockNow) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Meeting title is required')
        .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
      date: z.string().refine(isValidDateString, 'Enter a valid date (YYYY-MM-DD)'),
      startTime: z.string().refine(isValidTimeString, 'Enter a valid start time (HH:mm)'),
      endTime: z.string().refine(isValidTimeString, 'Enter a valid end time (HH:mm)'),
      participantIds: z
        .array(z.string().min(1, 'Participant must be an employee'))
        .refine((ids) => new Set(ids).size === ids.length, 'Participants must be unique'),
    })
    .superRefine((values, ctx) => {
      if (
        !isValidDateString(values.date) ||
        !isValidTimeString(values.startTime) ||
        !isValidTimeString(values.endTime)
      ) {
        return;
      }
      const errors = validateBookingTimes(
        {
          startTime: combineDateAndTime(values.date, values.startTime),
          endTime: combineDateAndTime(values.date, values.endTime),
        },
        getNow(),
      );
      for (const error of errors) {
        ctx.addIssue({ code: 'custom', path: [error.field], message: error.message });
      }
    });
}

export type BookingFormInput = z.input<ReturnType<typeof createBookingFormSchema>>;

