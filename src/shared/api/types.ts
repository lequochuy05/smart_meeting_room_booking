import type { Employee, LoginCredentials, Session } from '@/features/auth/types/auth';
import type { Booking, CreateBookingInput } from '@/features/bookings/types/booking';
import type { Participant } from '@/features/bookings/types/participant';
import type { Equipment, Room, RoomQuery, RoomSchedule } from '@/features/rooms/types/room';

/** Stable machine-readable error codes shared by every adapter. */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'BOOKING_CONFLICT'
  | 'PAST_TIME'
  | 'INVALID_STATE'
  | 'CHECK_IN_WINDOW_CLOSED'
  | 'CANCELLATION_NOT_ALLOWED'
  | 'UNKNOWN';

/** Consistent error body from the mobile API contract. */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

/** Normalized error thrown by every adapter and interceptor. */
export class AppError extends Error implements ApiErrorBody {
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly status?: number;

  constructor(code: ErrorCode, message: string, options?: { fieldErrors?: Record<string, string>; status?: number }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.status = options?.status;
  }

  get isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.code === 'UNKNOWN';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) return new AppError('UNKNOWN', error.message);
  return new AppError('UNKNOWN', 'Something went wrong. Please try again.');
}

export type MeetingListStatus = 'upcoming' | 'past';

/**
 * Transport-independent operations used by feature services. The HTTP adapter
 * and the standalone mock/local adapter implement identical behavior and
 * normalized errors (see contracts/mobile-api.md).
 */
export interface ApiAdapter {
  // Authentication
  login(credentials: LoginCredentials): Promise<Session>;
  logout(): Promise<void>;
  getCurrentEmployee(): Promise<Employee>;
  // Rooms
  listRooms(query: RoomQuery): Promise<Room[]>;
  getRoom(roomId: string): Promise<Room>;
  getRoomSchedule(roomId: string, date: string): Promise<RoomSchedule>;
  listEquipment(): Promise<Equipment[]>;
  // Participants
  searchEmployees(query: string): Promise<Participant[]>;
  // Bookings
  listMyBookings(status: MeetingListStatus): Promise<Booking[]>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  checkIn(bookingId: string): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<Booking>;
}
