import { z } from 'zod';

import type { Booking } from '@/features/bookings/types/booking';

export const ROOM_STATUSES = ['AVAILABLE', 'IN_USE', 'UPCOMING_BOOKING'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const EQUIPMENT_CATEGORIES = ['DISPLAY', 'WHITEBOARD', 'ONLINE_MEETING'] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
}

export interface Room {
  id: string;
  name: string;
  /** Positive integer. */
  capacity: number;
  floor: string;
  /** Unique equipment identifiers. */
  equipment: string[];
  status: RoomStatus;
  /** Company timezone identifier. */
  timezone: string;
}

/** A 30-minute slot of a room's daily timeline. */
export interface TimeSlot {
  startTime: string;
  endTime: string;
}

/** Derived (read-only) schedule of one room on one company-timezone date. */
export interface RoomSchedule {
  roomId: string;
  /** `YYYY-MM-DD` in the company timezone. */
  date: string;
  bookings: Booking[];
  availableSlots: TimeSlot[];
}

export const equipmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(EQUIPMENT_CATEGORIES),
});

export const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Room name is required'),
  capacity: z.number().int().positive('Capacity must be greater than zero'),
  floor: z.string().trim().min(1, 'Floor is required'),
  equipment: z
    .array(z.string().min(1))
    .refine((items) => new Set(items).size === items.length, 'Equipment must be unique'),
  status: z.enum(ROOM_STATUSES),
  timezone: z.string().min(1),
});

export function parseRoom(value: unknown): Room {
  return roomSchema.parse(value);
}

export interface RoomFilters {
  /** `YYYY-MM-DD` company date. */
  date: string;
  /** `HH:mm` or empty when not filtering by time. */
  startTime: string;
  endTime: string;
  minimumCapacity: number | null;
  equipment: string[];
}

/** Query sent to `GET /rooms`. Time values are ISO-8601 instants. */
export interface RoomQuery {
  date?: string;
  startTime?: string;
  endTime?: string;
  minimumCapacity?: number;
  equipment?: string[];
}
