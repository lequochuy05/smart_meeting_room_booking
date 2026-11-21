import { z } from 'zod';

import { deriveAvailableSlots } from '@/features/bookings/services/bookingRules';
import { bookingSchema } from '@/features/bookings/types/booking';
import { filterRooms } from '@/features/rooms/services/roomMatching';
import {
  equipmentSchema,
  roomSchema,
  type Equipment,
  type Room,
  type RoomFilters,
  type RoomQuery,
  type RoomSchedule,
} from '@/features/rooms/types/room';
import { getApiAdapter } from '@/shared/api';
import { AppError } from '@/shared/api/types';
import { now as clockNow } from '@/shared/utils/clock';
import {
  combineDateAndTime,
  isValidDateString,
  isValidTimeString,
} from '@/shared/utils/dateTime';

/** Validation message for the desired time range, or null when usable. */
export function validateFilterRange(filters: Pick<RoomFilters, 'startTime' | 'endTime'>): string | null {
  const { startTime, endTime } = filters;
  if (!startTime && !endTime) return null;
  if (!startTime || !endTime) return 'Enter both a start and an end time.';
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return 'Use the 24-hour format HH:mm.';
  if (endTime <= startTime) return 'End time must be later than the start time.';
  return null;
}

export function validateFilterDate(date: string): string | null {
  return isValidDateString(date) ? null : 'Enter a valid date (YYYY-MM-DD).';
}

/** Converts UI filters into the `GET /rooms` query. Invalid time ranges are not sent. */
export function filtersToQuery(filters: RoomFilters): RoomQuery {
  const query: RoomQuery = {};
  const dateValid = validateFilterDate(filters.date) === null;
  if (dateValid) query.date = filters.date;
  if (dateValid && validateFilterRange(filters) === null && filters.startTime && filters.endTime) {
    query.startTime = combineDateAndTime(filters.date, filters.startTime);
    query.endTime = combineDateAndTime(filters.date, filters.endTime);
  }
  if (filters.minimumCapacity !== null && filters.minimumCapacity > 0) {
    query.minimumCapacity = filters.minimumCapacity;
  }
  if (filters.equipment.length > 0) query.equipment = [...filters.equipment].sort();
  return query;
}

export async function fetchRooms(filters: RoomFilters): Promise<Room[]> {
  const query = filtersToQuery(filters);
  const rooms = z.array(roomSchema).parse(await getApiAdapter().listRooms(query));
  // Revalidate "all and only matching rooms" for capacity and equipment on the client.
  return filterRooms(rooms, query);
}

export async function fetchRoom(roomId: string): Promise<Room> {
  return roomSchema.parse(await getApiAdapter().getRoom(roomId));
}

export async function fetchRoomSchedule(roomId: string, date: string): Promise<RoomSchedule> {
  if (!isValidDateString(date)) {
    throw new AppError('VALIDATION_ERROR', 'Enter a valid date.', { fieldErrors: { date: 'Invalid date' } });
  }
  const schedule = await getApiAdapter().getRoomSchedule(roomId, date);
  const bookings = z.array(bookingSchema).parse(schedule.bookings);
  // Never trust cached availability: derive it again from the authoritative bookings.
  return {
    roomId: schedule.roomId,
    date: schedule.date,
    bookings,
    availableSlots: deriveAvailableSlots(date, bookings, clockNow()),
  };
}

export async function fetchEquipment(): Promise<Equipment[]> {
  return z.array(equipmentSchema).parse(await getApiAdapter().listEquipment());
}
