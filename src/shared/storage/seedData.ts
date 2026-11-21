import type { Employee } from '@/features/auth/types/auth';
import type { Booking } from '@/features/bookings/types/booking';
import type { Equipment, Room } from '@/features/rooms/types/room';
import { COMPANY_TIMEZONE, MINUTE_MS, addDays, combineDateAndTime, toCompanyDate, toCompanyIso } from '@/shared/utils/dateTime';

export const DEMO_PASSWORD = 'password';
export const DEMO_EMAIL = 'alex.nguyen@nashtech.example';

export const seedEquipment: Equipment[] = [
  { id: 'eq-display', name: 'Display', category: 'DISPLAY' },
  { id: 'eq-whiteboard', name: 'Whiteboard', category: 'WHITEBOARD' },
  { id: 'eq-video', name: 'Video conferencing', category: 'ONLINE_MEETING' },
  { id: 'eq-projector', name: 'Projector', category: 'DISPLAY' },
];

export const seedEmployees: Employee[] = [
  { id: 'emp-1', name: 'Alex Nguyen', email: DEMO_EMAIL },
  { id: 'emp-2', name: 'Binh Tran', email: 'binh.tran@nashtech.example' },
  { id: 'emp-3', name: 'Chi Le', email: 'chi.le@nashtech.example' },
  { id: 'emp-4', name: 'Dung Pham', email: 'dung.pham@nashtech.example' },
  { id: 'emp-5', name: 'Em Vo', email: 'em.vo@nashtech.example' },
  { id: 'emp-6', name: 'Phuong Hoang', email: 'phuong.hoang@nashtech.example' },
  { id: 'emp-7', name: 'Quang Do', email: 'quang.do@nashtech.example' },
  { id: 'emp-8', name: 'Thao Bui', email: 'thao.bui@nashtech.example' },
];

const room = (
  id: string,
  name: string,
  capacity: number,
  floor: string,
  equipment: string[],
): Room => ({ id, name, capacity, floor, equipment, status: 'AVAILABLE', timezone: COMPANY_TIMEZONE });

/** Static room catalog; `status` is derived by the adapter at read time. */
export const seedRooms: Room[] = [
  room('room-orion', 'Orion', 12, 'Floor 3', ['eq-display', 'eq-whiteboard', 'eq-video']),
  room('room-nova', 'Nova', 6, 'Floor 3', ['eq-display', 'eq-video']),
  room('room-atlas', 'Atlas', 8, 'Floor 2', ['eq-projector', 'eq-whiteboard']),
  room('room-vega', 'Vega', 4, 'Floor 2', ['eq-whiteboard']),
  room('room-lyra', 'Lyra', 20, 'Floor 5', ['eq-projector', 'eq-display', 'eq-video', 'eq-whiteboard']),
  room('room-draco', 'Draco', 2, 'Floor 1', []),
  room('room-cetus', 'Cetus', 10, 'Floor 4', ['eq-display', 'eq-whiteboard']),
  room('room-pyxis', 'Pyxis', 6, 'Floor 4', ['eq-video']),
];

/**
 * Representative bookings relative to `now`: an in-progress meeting, one inside
 * the check-in window, upcoming ones (including overlapping times in different
 * rooms), and past/cancelled history for the demo employee (`emp-1`).
 */
export function buildSeedBookings(now: Date): Booking[] {
  const nowMs = now.getTime();
  const today = toCompanyDate(now);
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const named = (id: string, roomId: string, startMs: number, durationMin: number) => ({
    id,
    roomId,
    roomName: seedRooms.find((r) => r.id === roomId)?.name ?? roomId,
    startTime: toCompanyIso(startMs),
    endTime: toCompanyIso(startMs + durationMin * MINUTE_MS),
  });
  const at = (date: string, time: string) => Date.parse(combineDateAndTime(date, time));

  return [
    {
      ...named('bk-seed-1', 'room-orion', nowMs - 20 * MINUTE_MS, 60),
      ownerId: 'emp-2',
      title: 'Platform architecture review',
      participantIds: ['emp-1', 'emp-3'],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-2', 'room-nova', nowMs + 10 * MINUTE_MS, 30),
      ownerId: 'emp-1',
      title: 'Design sync',
      participantIds: ['emp-2'],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-3', 'room-atlas', nowMs + 40 * MINUTE_MS, 60),
      ownerId: 'emp-3',
      title: 'Hiring sync',
      participantIds: ['emp-4'],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-4', 'room-nova', at(tomorrow, '10:00'), 60),
      ownerId: 'emp-1',
      title: 'Quarterly review',
      participantIds: ['emp-2', 'emp-3', 'emp-4'],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-5', 'room-atlas', at(tomorrow, '10:00'), 60),
      ownerId: 'emp-5',
      title: 'Vendor workshop',
      participantIds: ['emp-1'],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-6', 'room-lyra', at(tomorrow, '14:00'), 120),
      ownerId: 'emp-6',
      title: 'All-hands rehearsal',
      participantIds: [],
      status: 'UPCOMING',
    },
    {
      ...named('bk-seed-7', 'room-orion', at(yesterday, '14:00'), 60),
      ownerId: 'emp-1',
      title: 'Sprint retrospective',
      participantIds: ['emp-2', 'emp-3'],
      status: 'PAST',
    },
    {
      ...named('bk-seed-8', 'room-vega', at(yesterday, '09:00'), 30),
      ownerId: 'emp-1',
      title: 'One-on-one (cancelled)',
      participantIds: ['emp-7'],
      status: 'CANCELLED',
    },
  ];
}
