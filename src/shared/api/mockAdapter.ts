import type { Employee, LoginCredentials, Session } from '@/features/auth/types/auth';
import {
  deriveAvailableSlots,
  findConflict,
  isBlockingBooking,
  resolveBookingStatus,
  toTimeRange,
  validateBookingTimes,
} from '@/features/bookings/services/bookingRules';
import { applyCancellation, applyCheckIn } from '@/features/bookings/services/meetingActions';
import type { Booking, CreateBookingInput } from '@/features/bookings/types/booking';
import type { Participant } from '@/features/bookings/types/participant';
import { isRoomFreeForRange, matchesRoomCriteria } from '@/features/rooms/services/roomMatching';
import type { Equipment, Room, RoomQuery, RoomSchedule, RoomStatus } from '@/features/rooms/types/room';
import { getAuthToken } from '@/shared/api/authToken';
import { AppError, type ApiAdapter, type MeetingListStatus } from '@/shared/api/types';
import {
  DEMO_PASSWORD,
  buildSeedBookings,
  seedEmployees,
  seedEquipment,
  seedRooms,
} from '@/shared/storage/seedData';
import { now as clockNow } from '@/shared/utils/clock';
import {
  MINUTE_MS,
  getDayBounds,
  isValidDateString,
  isValidIso,
  parseIso,
} from '@/shared/utils/dateTime';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

export type FailureMode = 'none' | 'network' | 'timeout';

export interface MockControls {
  setFailureMode(mode: FailureMode): void;
  getFailureMode(): FailureMode;
  /** Fail only the next `count` calls with a network error. */
  failNext(count?: number): void;
  setLatency(ms: number): void;
  /** Delete persisted data and re-seed relative to the current time. */
  resetData(): Promise<void>;
}

export type MockApiAdapter = ApiAdapter & { controls: MockControls };

export interface MockAdapterOptions {
  storage?: KeyValueStorage;
  now?: () => Date;
  latencyMs?: number;
  getToken?: () => Promise<string | null>;
  storageKey?: string;
}

interface PersistedState {
  version: 1;
  bookings: Booking[];
}

export const MOCK_STORAGE_KEY = 'smartroom.mock.v1';
const TOKEN_PREFIX = 'mock-token.';
/** Rooms with a booking starting within this window are "Upcoming Booking". */
export const UPCOMING_BOOKING_WINDOW_MINUTES = 60;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Standalone adapter: seeded static catalog plus bookings persisted in local
 * storage. It is authoritative for conflicts and state transitions, applying
 * every mutation under a lock so concurrent attempts cannot double-book.
 */
export function createMockAdapter(options: MockAdapterOptions = {}): MockApiAdapter {
  const storage = options.storage ?? createMemoryStorage();
  const getNow = options.now ?? clockNow;
  const readToken = options.getToken ?? getAuthToken;
  const storageKey = options.storageKey ?? MOCK_STORAGE_KEY;
  let latencyMs = options.latencyMs ?? 0;
  let failureMode: FailureMode = 'none';
  let failuresRemaining = 0;
  let queue: Promise<unknown> = Promise.resolve();

  async function simulateTransport(): Promise<void> {
    if (latencyMs > 0) await wait(latencyMs);
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      throw new AppError('NETWORK_ERROR', 'Network unavailable. Check your connection and try again.');
    }
    if (failureMode === 'network') {
      throw new AppError('NETWORK_ERROR', 'Network unavailable. Check your connection and try again.');
    }
    if (failureMode === 'timeout') {
      throw new AppError('TIMEOUT', 'The request timed out. Check your connection and try again.');
    }
  }

  function withLock<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function load(): Promise<PersistedState> {
    const raw = await storage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.version === 1 && Array.isArray(parsed.bookings)) return parsed;
      } catch {
        // fall through and re-seed corrupted data
      }
    }
    const fresh: PersistedState = { version: 1, bookings: buildSeedBookings(getNow()) };
    await storage.setItem(storageKey, JSON.stringify(fresh));
    return fresh;
  }

  async function save(state: PersistedState): Promise<void> {
    await storage.setItem(storageKey, JSON.stringify(state));
  }

  /** Runs a read operation after transport simulation, serialized with writers. */
  async function read<T>(task: (state: PersistedState) => T): Promise<T> {
    await simulateTransport();
    return withLock(async () => task(await load()));
  }

  async function write<T>(task: (state: PersistedState) => Promise<T> | T): Promise<T> {
    await simulateTransport();
    return withLock(async () => {
      const state = await load();
      const result = await task(state);
      await save(state);
      return result;
    });
  }

  async function requireEmployee(): Promise<Employee> {
    const token = await readToken();
    const id = token?.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
    const employee = seedEmployees.find((candidate) => candidate.id === id);
    if (!employee) throw new AppError('UNAUTHORIZED', 'Your session has expired. Please sign in again.', { status: 401 });
    return employee;
  }

  const withResolvedStatus = (booking: Booking, now: Date): Booking => ({
    ...booking,
    status: resolveBookingStatus(booking, now),
  });

  function roomStatus(room: Room, bookings: Booking[], now: Date): RoomStatus {
    const nowMs = now.getTime();
    const active = bookings
      .filter((b) => b.roomId === room.id && isBlockingBooking(b))
      .map((b) => withResolvedStatus(b, now))
      .filter((b) => b.status !== 'PAST');
    if (active.some((b) => (parseIso(b.startTime) as number) <= nowMs && nowMs < (parseIso(b.endTime) as number))) {
      return 'IN_USE';
    }
    const soonMs = nowMs + UPCOMING_BOOKING_WINDOW_MINUTES * MINUTE_MS;
    if (active.some((b) => {
      const start = parseIso(b.startTime) as number;
      return start > nowMs && start <= soonMs;
    })) {
      return 'UPCOMING_BOOKING';
    }
    return 'AVAILABLE';
  }

  function requireRoom(roomId: string): Room {
    const room = seedRooms.find((candidate) => candidate.id === roomId);
    if (!room) throw new AppError('NOT_FOUND', 'Room not found.', { status: 404 });
    return room;
  }

  function validateCreateInput(input: CreateBookingInput, now: Date, state: PersistedState): void {
    const fieldErrors: Record<string, string> = {};
    if (!input.title || input.title.trim().length === 0) fieldErrors.title = 'Meeting title is required';

    for (const id of input.participantIds ?? []) {
      if (!seedEmployees.some((employee) => employee.id === id)) {
        fieldErrors.participantIds = 'Participants must be employees in the company directory';
        break;
      }
    }
    if (new Set(input.participantIds ?? []).size !== (input.participantIds ?? []).length) {
      fieldErrors.participantIds = 'Participants must be unique';
    }

    if (!isValidIso(input.startTime)) fieldErrors.startTime = 'Enter a valid start time';
    if (!isValidIso(input.endTime)) fieldErrors.endTime = 'Enter a valid end time';
    let pastOnly = false;
    if (!fieldErrors.startTime && !fieldErrors.endTime) {
      const timeErrors = validateBookingTimes(input, now);
      for (const error of timeErrors) fieldErrors[error.field] = error.message;
      pastOnly = timeErrors.length > 0 && timeErrors.every((error) => error.code === 'START_IN_PAST');
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new AppError(pastOnly ? 'PAST_TIME' : 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
        fieldErrors,
        status: 422,
      });
    }

    void state;
  }

  return {
    controls: {
      setFailureMode: (mode) => {
        failureMode = mode;
      },
      getFailureMode: () => failureMode,
      failNext: (count = 1) => {
        failuresRemaining = count;
      },
      setLatency: (ms) => {
        latencyMs = ms;
      },
      resetData: () =>
        withLock(async () => {
          await storage.removeItem(storageKey);
          await load();
        }),
    },

    async login(credentials: LoginCredentials): Promise<Session> {
      await simulateTransport();
      const employee = seedEmployees.find(
        (candidate) => candidate.email.toLowerCase() === credentials.email.trim().toLowerCase(),
      );
      if (!employee || credentials.password !== DEMO_PASSWORD) {
        throw new AppError('UNAUTHORIZED', 'Incorrect email or password.', { status: 401 });
      }
      return { token: `${TOKEN_PREFIX}${employee.id}`, employee };
    },

    async logout(): Promise<void> {
      await simulateTransport();
    },

    async getCurrentEmployee(): Promise<Employee> {
      await simulateTransport();
      return requireEmployee();
    },

    async listRooms(query: RoomQuery): Promise<Room[]> {
      await requireEmployee();
      return read((state) => {
        const now = getNow();
        const hasRange = Boolean(query.startTime && query.endTime);
        if (hasRange) {
          const errors = validateBookingTimes({ startTime: query.startTime as string, endTime: query.endTime as string }, new Date(0));
          if (errors.length > 0) {
            throw new AppError('VALIDATION_ERROR', 'Enter a valid time range.', {
              fieldErrors: Object.fromEntries(errors.map((e) => [e.field, e.message])),
              status: 422,
            });
          }
        }
        return seedRooms
          .filter((room) => matchesRoomCriteria(room, query))
          .filter((room) =>
            hasRange
              ? isRoomFreeForRange(room, state.bookings, {
                  startTime: query.startTime as string,
                  endTime: query.endTime as string,
                })
              : true,
          )
          .map((room) => ({ ...room, equipment: [...room.equipment], status: roomStatus(room, state.bookings, now) }));
      });
    },

    async getRoom(roomId: string): Promise<Room> {
      await requireEmployee();
      return read((state) => {
        const room = requireRoom(roomId);
        return { ...room, equipment: [...room.equipment], status: roomStatus(room, state.bookings, getNow()) };
      });
    },

    async getRoomSchedule(roomId: string, date: string): Promise<RoomSchedule> {
      await requireEmployee();
      return read((state) => {
        requireRoom(roomId);
        if (!isValidDateString(date)) {
          throw new AppError('VALIDATION_ERROR', 'Enter a valid date.', { fieldErrors: { date: 'Invalid date' }, status: 422 });
        }
        const now = getNow();
        const { startMs, endMs } = getDayBounds(date);
        const bookings = state.bookings
          .filter((b) => b.roomId === roomId && isBlockingBooking(b))
          .filter((b) => {
            const range = toTimeRange(b);
            return range !== null && range.startMs < endMs && startMs < range.endMs;
          })
          .map((b) => withResolvedStatus(b, now))
          .sort((a, b) => (parseIso(a.startTime) as number) - (parseIso(b.startTime) as number));
        return { roomId, date, bookings, availableSlots: deriveAvailableSlots(date, bookings, now) };
      });
    },

    async listEquipment(): Promise<Equipment[]> {
      await requireEmployee();
      return read(() => seedEquipment.map((item) => ({ ...item })));
    },

    async searchEmployees(query: string): Promise<Participant[]> {
      await requireEmployee();
      return read(() => {
        const needle = query.trim().toLowerCase();
        return seedEmployees
          .filter((e) => needle === '' || e.name.toLowerCase().includes(needle) || e.email.toLowerCase().includes(needle))
          .slice(0, 10)
          .map(({ id, name, email }) => ({ id, name, email }));
      });
    },

    async listMyBookings(status: MeetingListStatus): Promise<Booking[]> {
      const employee = await requireEmployee();
      return read((state) => {
        const now = getNow();
        const mine = state.bookings
          .filter((b) => b.ownerId === employee.id || b.participantIds.includes(employee.id))
          .map((b) => withResolvedStatus(b, now));
        const upcoming = mine.filter((b) => b.status === 'UPCOMING' || b.status === 'CHECKED_IN');
        const past = mine.filter((b) => b.status === 'PAST' || b.status === 'CANCELLED');
        const start = (b: Booking) => parseIso(b.startTime) as number;
        return status === 'upcoming'
          ? upcoming.sort((a, b) => start(a) - start(b))
          : past.sort((a, b) => start(b) - start(a));
      });
    },

    async createBooking(input: CreateBookingInput): Promise<Booking> {
      const employee = await requireEmployee();
      return write(async (state) => {
        const now = getNow();
        const room = requireRoom(input.roomId);
        validateCreateInput(input, now, state);
        const conflict = findConflict(state.bookings, room.id, input);
        if (conflict) {
          throw new AppError(
            'BOOKING_CONFLICT',
            `${room.name} is already booked for part of this time. Choose another time or room.`,
            { status: 409 },
          );
        }
        const booking: Booking = {
          id: `bk-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          roomId: room.id,
          roomName: room.name,
          ownerId: employee.id,
          title: input.title.trim(),
          startTime: input.startTime,
          endTime: input.endTime,
          participantIds: [...input.participantIds],
          status: 'UPCOMING',
        };
        state.bookings.push(booking);
        return booking;
      });
    },

    async checkIn(bookingId: string): Promise<Booking> {
      const employee = await requireEmployee();
      return write((state) => transition(state, bookingId, (b, now) => applyCheckIn(b, now, employee.id), getNow()));
    },

    async cancelBooking(bookingId: string): Promise<Booking> {
      const employee = await requireEmployee();
      return write((state) =>
        transition(state, bookingId, (b, now) => applyCancellation(b, now, employee.id), getNow()),
      );
    },
  };
}

function transition(
  state: PersistedState,
  bookingId: string,
  apply: (booking: Booking, now: Date) => Booking,
  now: Date,
): Booking {
  const index = state.bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) throw new AppError('NOT_FOUND', 'Meeting not found.', { status: 404 });
  const updated = apply(state.bookings[index], now);
  state.bookings[index] = updated;
  return updated;
}
