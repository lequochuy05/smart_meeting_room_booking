import { QueryClient } from '@tanstack/react-query';

import type { MeetingListStatus } from '@/shared/api/types';

/** Application query keys. Hierarchical so prefixes can be invalidated together. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  equipment: ['equipment'] as const,
  rooms: {
    all: ['rooms'] as const,
    lists: () => ['rooms', 'list'] as const,
    list: (filters: unknown) => ['rooms', 'list', filters] as const,
    detail: (roomId: string) => ['rooms', 'detail', roomId] as const,
    schedules: () => ['rooms', 'schedule'] as const,
    schedule: (roomId: string, date: string) => ['rooms', 'schedule', roomId, date] as const,
  },
  employees: {
    search: (query: string) => ['employees', 'search', query] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    mine: (status: MeetingListStatus) => ['bookings', 'mine', status] as const,
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cached data improves responsiveness but never authorizes a booking.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Surface network errors immediately so Retry is actionable.
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
