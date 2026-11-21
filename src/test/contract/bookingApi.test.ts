import type { ApiAdapter } from '@/shared/api/types';
import { createMemoryStorage, createMockAdapter } from '@/shared/api/mockAdapter';
import { AppError } from '@/shared/api/types';
import { combineDateAndTime } from '@/shared/utils/dateTime';
import { createHttpAdapterOverBackend, setupTestEnvironment, teardownTestEnvironment } from '@/test/utils';

const TODAY = '2026-11-21';
const TOMORROW = '2026-11-22';
const at = (time: string, date = TODAY) => combineDateAndTime(date, time);

const input = (overrides: Record<string, unknown> = {}) => ({
  roomId: 'room-vega',
  title: 'Retro',
  startTime: at('13:00'),
  endTime: at('14:00'),
  participantIds: ['emp-2'],
  ...overrides,
});

const transports: [string, () => ApiAdapter][] = [
  ['standalone adapter', () => setupTestEnvironment()],
  ['HTTP adapter', () => createHttpAdapterOverBackend(setupTestEnvironment())],
];

async function failure(promise: Promise<unknown>): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe.each(transports)('booking API contract (%s)', (_name, create) => {
  let api: ApiAdapter;
  beforeEach(() => {
    api = create();
  });
  afterEach(teardownTestEnvironment);

  it('POST /bookings creates an UPCOMING booking owned by the current employee', async () => {
    const booking = await api.createBooking(input());
    expect(booking).toMatchObject({
      roomId: 'room-vega',
      roomName: 'Vega',
      ownerId: 'emp-1',
      title: 'Retro',
      status: 'UPCOMING',
      participantIds: ['emp-2'],
    });
    expect(booking.startTime).toBe('2026-11-21T13:00:00+07:00');
    const schedule = await api.getRoomSchedule('room-vega', TODAY);
    expect(schedule.bookings.map((b) => b.id)).toContain(booking.id);
  });

  it('returns a conflict before creating an overlapping booking', async () => {
    await api.createBooking(input());
    const error = await failure(api.createBooking(input({ startTime: at('13:30'), endTime: at('14:30') })));
    expect(error.code).toBe('BOOKING_CONFLICT');
    const schedule = await api.getRoomSchedule('room-vega', TODAY);
    expect(schedule.bookings).toHaveLength(1);
  });

  it('accepts bookings that only touch the boundary of an existing booking', async () => {
    await api.createBooking(input());
    await expect(api.createBooking(input({ startTime: at('14:00'), endTime: at('15:00') }))).resolves.toBeDefined();
    await expect(api.createBooking(input({ startTime: at('12:00'), endTime: at('13:00') }))).resolves.toBeDefined();
  });

  it('allows only one of several concurrent requests for the same room and time', async () => {
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => api.createBooking(input())));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(4);
    expect(rejected.every((r) => (r.reason as AppError).code === 'BOOKING_CONFLICT')).toBe(true);
  });

  it('frees the room again after the booking is cancelled', async () => {
    const booking = await api.createBooking(input({ startTime: at('10:00', TOMORROW), endTime: at('11:00', TOMORROW) }));
    await api.cancelBooking(booking.id);
    await expect(
      api.createBooking(input({ startTime: at('10:00', TOMORROW), endTime: at('11:00', TOMORROW) })),
    ).resolves.toBeDefined();
  });

  it('rejects a missing title with a field error', async () => {
    const error = await failure(api.createBooking(input({ title: '  ' })));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors?.title).toBeDefined();
  });

  it('rejects an end time that is not after the start time', async () => {
    const error = await failure(api.createBooking(input({ startTime: at('14:00'), endTime: at('13:00') })));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors?.endTime).toBeDefined();
  });

  it('rejects start times in the past', async () => {
    const error = await failure(api.createBooking(input({ startTime: at('07:00'), endTime: at('08:00') })));
    expect(error.code).toBe('PAST_TIME');
    expect(error.fieldErrors?.startTime).toBeDefined();
  });

  it('rejects date-times without a timezone offset', async () => {
    const error = await failure(
      api.createBooking(input({ startTime: '2026-11-21T13:00:00', endTime: '2026-11-21T14:00:00' })),
    );
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects participants that are not in the employee directory', async () => {
    const error = await failure(api.createBooking(input({ participantIds: ['emp-2', 'stranger'] })));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors?.participantIds).toBeDefined();
  });

  it('reports NOT_FOUND for an unknown room', async () => {
    expect((await failure(api.createBooking(input({ roomId: 'nowhere' })))).code).toBe('NOT_FOUND');
  });

  it('GET /employees/search searches name and email, and returns only directory entries', async () => {
    const byName = await api.searchEmployees('binh');
    expect(byName.map((p) => p.id)).toEqual(['emp-2']);
    const byEmail = await api.searchEmployees('CHI.LE@');
    expect(byEmail.map((p) => p.id)).toEqual(['emp-3']);
    expect(await api.searchEmployees('zzzz')).toEqual([]);
    expect((await api.searchEmployees('')).length).toBeGreaterThan(1);
  });

  it('does not persist a booking when the network fails', async () => {
    const backend = setupTestEnvironment();
    const failing = _name === 'HTTP adapter' ? createHttpAdapterOverBackend(backend) : backend;
    backend.controls.setFailureMode('network');
    expect((await failure(failing.createBooking(input()))).code).toBe('NETWORK_ERROR');
    backend.controls.setFailureMode('none');
    const schedule = await failing.getRoomSchedule('room-vega', TODAY);
    expect(schedule.bookings).toHaveLength(0);
  });
});

describe('standalone persistence', () => {
  afterEach(teardownTestEnvironment);

  it('persists bookings through the injected storage across adapter instances', async () => {
    // A second adapter over the same storage sees the booking (reopen-app scenario).
    const storage = createMemoryStorage();
    const now = () => new Date('2026-11-21T09:00:00+07:00');
    const options = { storage, now, getToken: async () => 'mock-token.emp-1' };
    const first = createMockAdapter(options);
    const created = await first.createBooking(input());
    const second = createMockAdapter(options);
    const schedule = await second.getRoomSchedule('room-vega', TODAY);
    expect(schedule.bookings.map((b) => b.id)).toContain(created.id);
  });
});
