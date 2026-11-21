import type { AxiosInstance } from 'axios';

import type { Employee, LoginCredentials, Session } from '@/features/auth/types/auth';
import type { Booking, CreateBookingInput } from '@/features/bookings/types/booking';
import type { Participant } from '@/features/bookings/types/participant';
import type { Equipment, Room, RoomQuery, RoomSchedule } from '@/features/rooms/types/room';
import { apiClient } from '@/shared/api/client';
import type { ApiAdapter, MeetingListStatus } from '@/shared/api/types';

/** Real REST adapter implementing contracts/mobile-api.md over Axios. */
export function createHttpAdapter(client: AxiosInstance = apiClient): ApiAdapter {
  return {
    async login(credentials: LoginCredentials) {
      return (await client.post<Session>('/auth/login', credentials)).data;
    },
    async logout() {
      await client.post('/auth/logout');
    },
    async getCurrentEmployee() {
      return (await client.get<Employee>('/auth/me')).data;
    },
    async listRooms(query: RoomQuery) {
      return (await client.get<Room[]>('/rooms', { params: query })).data;
    },
    async getRoom(roomId: string) {
      return (await client.get<Room>(`/rooms/${encodeURIComponent(roomId)}`)).data;
    },
    async getRoomSchedule(roomId: string, date: string) {
      return (
        await client.get<RoomSchedule>(`/rooms/${encodeURIComponent(roomId)}/schedule`, { params: { date } })
      ).data;
    },
    async listEquipment() {
      return (await client.get<Equipment[]>('/equipment')).data;
    },
    async searchEmployees(query: string) {
      return (await client.get<Participant[]>('/employees/search', { params: { query } })).data;
    },
    async listMyBookings(status: MeetingListStatus) {
      return (await client.get<Booking[]>('/bookings/mine', { params: { status } })).data;
    },
    async createBooking(input: CreateBookingInput) {
      return (await client.post<Booking>('/bookings', input)).data;
    },
    async checkIn(bookingId: string) {
      return (await client.post<Booking>(`/bookings/${encodeURIComponent(bookingId)}/check-in`)).data;
    },
    async cancelBooking(bookingId: string) {
      return (await client.post<Booking>(`/bookings/${encodeURIComponent(bookingId)}/cancel`)).data;
    },
  };
}
