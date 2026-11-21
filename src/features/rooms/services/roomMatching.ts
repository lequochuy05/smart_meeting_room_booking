import { findConflict } from '@/features/bookings/services/bookingRules';
import type { Booking } from '@/features/bookings/types/booking';
import type { Room, RoomQuery } from '@/features/rooms/types/room';

/** Capacity and equipment criteria: a room must satisfy every selected filter. */
export function matchesRoomCriteria(room: Room, query: Pick<RoomQuery, 'minimumCapacity' | 'equipment'>): boolean {
  if (query.minimumCapacity !== undefined && room.capacity < query.minimumCapacity) return false;
  if (query.equipment && query.equipment.length > 0) {
    return query.equipment.every((id) => room.equipment.includes(id));
  }
  return true;
}

/** True when the room has no active booking overlapping the requested time range. */
export function isRoomFreeForRange(
  room: Room,
  bookings: readonly Booking[],
  range: { startTime: string; endTime: string },
): boolean {
  return findConflict(bookings, room.id, range) === null;
}

/** Returns all and only the rooms matching every selected criterion. */
export function filterRooms(rooms: readonly Room[], query: Pick<RoomQuery, 'minimumCapacity' | 'equipment'>): Room[] {
  return rooms.filter((room) => matchesRoomCriteria(room, query));
}
