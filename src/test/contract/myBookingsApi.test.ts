import type { Booking } from '@/features/bookings/types/booking';
import { createMemoryStorage, createMockAdapter } from '@/shared/api/mockAdapter';
import type { ApiAdapter } from '@/shared/api/types';
import { AppError } from '@/shared/api/types';
import { setNowProvider } from '@/shared/utils/clock';
import {
  TEST_NOW,
  createHttpAdapterOverBackend,
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/test/utils';

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

describe.each(transports)('my bookings API contract (%s)', (_name, create) => {
  let api: ApiAdapter;
  beforeEach(() => {
    api = create();
  });
  afterEach(teardownTestEnvironment);

  it('GET /bookings/mine?status=upcoming lists upcoming meetings chronologically (organizer or participant)', async () => {
    const upcoming = await api.listMyBookings('upcoming');
    expect(upcoming.map((b) => b.id)).toEqual(['bk-seed-1', 'bk-seed-2', 'bk-seed-4', 'bk-seed-5']);
    expect(upcoming.every((b) => b.status === 'UPCOMING')).toBe(true);
  });

  it('GET /bookings/mine?status=past lists finished and cancelled meetings, most recent first', async () => {
    const past = await api.listMyBookings('past');
    expect(past.map((b) => b.id)).toEqual(['bk-seed-7', 'bk-seed-8']);
    expect(past.map((b) => b.status)).toEqual(['PAST', 'CANCELLED']);
  });

  it('POST /bookings/{id}/check-in checks in inside the window and returns the new state', async () => {
    const booking = await api.checkIn('bk-seed-2'); // starts 09:10, now 09:00
    expect(booking.status).toBe('CHECKED_IN');
    const upcoming = await api.listMyBookings('upcoming');
    expect(upcoming.find((b) => b.id === 'bk-seed-2')?.status).toBe('CHECKED_IN');
  });

  it('rejects check-in before the window opens', async () => {
    const error = await failure(api.checkIn('bk-seed-4')); // tomorrow
    expect(error.code).toBe('CHECK_IN_WINDOW_CLOSED');
  });

  it('rejects a second check-in with INVALID_STATE', async () => {
    await api.checkIn('bk-seed-2');
    expect((await failure(api.checkIn('bk-seed-2'))).code).toBe('INVALID_STATE');
  });

  it('denies check-in and cancellation to employees who are not the organizer', async () => {
    expect((await failure(api.checkIn('bk-seed-1'))).code).toBe('FORBIDDEN');
    expect((await failure(api.cancelBooking('bk-seed-1'))).code).toBe('FORBIDDEN');
  });

  it('POST /bookings/{id}/cancel cancels an upcoming meeting before it starts', async () => {
    const cancelled = await api.cancelBooking('bk-seed-4');
    expect(cancelled.status).toBe('CANCELLED');
    const upcoming = await api.listMyBookings('upcoming');
    expect(upcoming.map((b) => b.id)).not.toContain('bk-seed-4');
    const past = await api.listMyBookings('past');
    expect(past.map((b) => b.id)).toContain('bk-seed-4');
  });

  it('rejects cancelling twice, after start, and for past meetings', async () => {
    await api.cancelBooking('bk-seed-4');
    expect((await failure(api.cancelBooking('bk-seed-4'))).code).toBe('INVALID_STATE');
    expect((await failure(api.cancelBooking('bk-seed-7'))).code).toBe('INVALID_STATE');
  });

  it('reports NOT_FOUND for unknown meetings', async () => {
    expect((await failure(api.checkIn('missing'))).code).toBe('NOT_FOUND');
    expect((await failure(api.cancelBooking('missing'))).code).toBe('NOT_FOUND');
  });

  it('does not change state when the network fails', async () => {
    const backend = setupTestEnvironment();
    const failing = _name === 'HTTP adapter' ? createHttpAdapterOverBackend(backend) : backend;
    backend.controls.setFailureMode('network');
    expect((await failure(failing.cancelBooking('bk-seed-4'))).code).toBe('NETWORK_ERROR');
    backend.controls.setFailureMode('none');
    const upcoming = await failing.listMyBookings('upcoming');
    expect(upcoming.map((b) => b.id)).toContain('bk-seed-4');
  });
});

describe('time-based status transitions', () => {
  afterEach(teardownTestEnvironment);

  it('turns ended meetings into PAST and closes the cancellation window', async () => {
    let current = TEST_NOW;
    const adapter = createMockAdapter({
      storage: createMemoryStorage(),
      now: () => current,
      getToken: async () => 'mock-token.emp-1',
    });
    setNowProvider(() => current);
    expect((await adapter.listMyBookings('upcoming')).map((b: Booking) => b.id)).toContain('bk-seed-2');

    current = new Date(TEST_NOW.getTime() + 60 * 60 * 1000); // 10:00, seed-2 ended 09:40
    const upcoming = await adapter.listMyBookings('upcoming');
    expect(upcoming.map((b) => b.id)).not.toContain('bk-seed-2');
    expect((await adapter.listMyBookings('past')).map((b) => b.id)).toContain('bk-seed-2');
    expect((await failure(adapter.cancelBooking('bk-seed-2'))).code).toBe('INVALID_STATE');
  });

  it('closes check-in 15 minutes after the start', async () => {
    let current = TEST_NOW; // seed-2 starts 09:10 -> check-in window closes 09:25
    const adapter = createMockAdapter({
      storage: createMemoryStorage(),
      now: () => current,
      getToken: async () => 'mock-token.emp-1',
    });
    await adapter.listMyBookings('upcoming'); // seeds relative to 09:00
    current = new Date('2026-11-21T09:25:00+07:00');
    await expect(adapter.checkIn('bk-seed-2')).resolves.toMatchObject({ status: 'CHECKED_IN' });
    current = TEST_NOW;
    await adapter.controls.resetData();
    current = new Date('2026-11-21T09:26:00+07:00');
    expect((await failure(adapter.checkIn('bk-seed-2'))).code).toBe('CHECK_IN_WINDOW_CLOSED');
  });
});
