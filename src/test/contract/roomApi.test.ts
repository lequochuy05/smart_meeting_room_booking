import type { ApiAdapter } from '@/shared/api/types';
import { AppError } from '@/shared/api/types';
import { combineDateAndTime } from '@/shared/utils/dateTime';
import { TEST_NOW, createHttpAdapterOverBackend, setupTestEnvironment, teardownTestEnvironment } from '@/test/utils';

const DATE = '2026-11-21';
const at = (time: string, date = DATE) => combineDateAndTime(date, time);

type Factory = () => ApiAdapter;
const transports: [string, Factory][] = [
  ['standalone adapter', () => setupTestEnvironment()],
  ['HTTP adapter', () => createHttpAdapterOverBackend(setupTestEnvironment())],
];

describe.each(transports)('room API contract (%s)', (_name, create) => {
  let api: ApiAdapter;
  beforeEach(() => {
    api = create();
  });
  afterEach(teardownTestEnvironment);

  it('GET /rooms lists every room with a derived status', async () => {
    const rooms = await api.listRooms({});
    expect(rooms).toHaveLength(8);
    const status = Object.fromEntries(rooms.map((r) => [r.id, r.status]));
    expect(status['room-orion']).toBe('IN_USE');
    expect(status['room-nova']).toBe('UPCOMING_BOOKING');
    expect(status['room-vega']).toBe('AVAILABLE');
    for (const room of rooms) {
      expect(room.capacity).toBeGreaterThan(0);
      expect(new Set(room.equipment).size).toBe(room.equipment.length);
    }
  });

  it('filters by minimum capacity and required equipment (all and only matches)', async () => {
    const big = await api.listRooms({ minimumCapacity: 10 });
    expect(big.map((r) => r.id).sort()).toEqual(['room-cetus', 'room-lyra', 'room-orion']);
    const equipped = await api.listRooms({ equipment: ['eq-video', 'eq-whiteboard'] });
    expect(equipped.map((r) => r.id).sort()).toEqual(['room-lyra', 'room-orion']);
    const none = await api.listRooms({ minimumCapacity: 50 });
    expect(none).toEqual([]);
  });

  it('filters out rooms with an overlapping booking for the requested range', async () => {
    const rooms = await api.listRooms({ date: DATE, startTime: at('09:00'), endTime: at('09:30') });
    const ids = rooms.map((r) => r.id);
    expect(ids).not.toContain('room-orion'); // 08:40–09:40
    expect(ids).not.toContain('room-nova'); // starts 09:10
    expect(ids).toContain('room-atlas'); // starts 09:40
  });

  it('keeps rooms whose bookings only touch the requested range', async () => {
    const rooms = await api.listRooms({ date: DATE, startTime: at('09:40'), endTime: at('10:00') });
    // Orion ends 09:40 exactly and Nova ends 09:40 exactly.
    expect(rooms.map((r) => r.id)).toEqual(expect.arrayContaining(['room-orion', 'room-nova']));
    expect(rooms.map((r) => r.id)).not.toContain('room-atlas');
  });

  it('rejects an invalid time range', async () => {
    await expect(api.listRooms({ startTime: at('10:00'), endTime: at('09:00') })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('GET /rooms/{roomId} returns room details', async () => {
    const room = await api.getRoom('room-lyra');
    expect(room).toMatchObject({ id: 'room-lyra', name: 'Lyra', capacity: 20, floor: 'Floor 5' });
  });

  it('GET /rooms/{roomId} reports NOT_FOUND with the normalized error', async () => {
    const error = await api.getRoom('missing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('NOT_FOUND');
  });

  it('GET /rooms/{roomId}/schedule returns booked periods and derived available slots', async () => {
    const schedule = await api.getRoomSchedule('room-nova', DATE);
    expect(schedule.roomId).toBe('room-nova');
    expect(schedule.bookings.map((b) => b.id)).toEqual(['bk-seed-2']);
    const starts = schedule.availableSlots.map((s) => s.startTime);
    expect(starts).not.toContain(at('09:00')); // overlaps the 09:10–09:40 booking
    expect(starts).not.toContain(at('09:30')); // overlaps the 09:10–09:40 booking
    expect(starts).toContain(at('10:00'));
    expect(starts).not.toContain(at('08:30')); // in the past
    for (const slot of schedule.availableSlots) {
      expect(slot.startTime).toMatch(/\+07:00$/);
    }
  });

  it('GET /rooms/{roomId}/schedule validates the date', async () => {
    await expect(api.getRoomSchedule('room-nova', '2026-13-40')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('GET /equipment lists equipment with categories', async () => {
    const equipment = await api.listEquipment();
    expect(equipment.map((e) => e.category)).toEqual(expect.arrayContaining(['DISPLAY', 'WHITEBOARD', 'ONLINE_MEETING']));
  });

  it('surfaces network failures as retryable NETWORK_ERROR', async () => {
    const backend = setupTestEnvironment();
    const failing = _name === 'HTTP adapter' ? createHttpAdapterOverBackend(backend) : backend;
    backend.controls.setFailureMode('network');
    const error = (await failing.listRooms({}).catch((e: unknown) => e)) as AppError;
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isRetryable).toBe(true);
    backend.controls.setFailureMode('none');
    await expect(failing.listRooms({})).resolves.toHaveLength(8);
  });

  it('requires an authenticated employee', async () => {
    const backend = setupTestEnvironment({ token: null });
    const anonymous = _name === 'HTTP adapter' ? createHttpAdapterOverBackend(backend) : backend;
    await expect(anonymous.listRooms({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('uses the injected clock', () => {
    expect(TEST_NOW.toISOString()).toBe('2026-11-21T02:00:00.000Z');
  });
});
