import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBookingDraftStore } from '@/features/bookings/hooks/useBookingDraft';
import { useRoomFilters } from '@/features/rooms/hooks/useRoomFilters';
import { useSlotSelection } from '@/features/rooms/hooks/useSlotSelection';
import { registerTokenProvider } from '@/shared/api/authToken';
import { setApiAdapter } from '@/shared/api';
import { createApiClient } from '@/shared/api/client';
import { createHttpAdapter } from '@/shared/api/httpAdapter';
import { createMemoryStorage, createMockAdapter, type MockApiAdapter } from '@/shared/api/mockAdapter';
import { createFakeServerAdapter } from '@/test/mocks/fakeServer';
import { queryClient as appQueryClient } from '@/shared/api/queryClient';
import { setNowProvider } from '@/shared/utils/clock';
import type { ApiAdapter } from '@/shared/api/types';

/** 2026-11-21 09:00 company time. */
export const TEST_NOW = new Date('2026-11-21T09:00:00+07:00');
export const TEST_EMPLOYEE_ID = 'emp-1';
export const TEST_TOKEN = `mock-token.${TEST_EMPLOYEE_ID}`;

const activeQueryClients = new Set<QueryClient>();

export interface TestEnvironment {
  adapter: MockApiAdapter;
  queryClient: QueryClient;
}

export function setupTestEnvironment(options: { now?: Date; token?: string | null } = {}): MockApiAdapter {
  const now = options.now ?? TEST_NOW;
  const token = options.token === undefined ? TEST_TOKEN : options.token;
  setNowProvider(() => now);
  registerTokenProvider(async () => token);
  const adapter = createMockAdapter({
    storage: createMemoryStorage(),
    now: () => now,
    getToken: async () => token,
  });
  setApiAdapter(adapter);
  useRoomFilters.getState().reset();
  useSlotSelection.getState().clear();
  useBookingDraftStore.setState({ drafts: {} });
  useAuth.setState({ status: 'unauthenticated', employee: null, error: null, isSubmitting: false });
  return adapter;
}

export function teardownTestEnvironment(): void {
  for (const client of activeQueryClients) {
    client.clear();
  }
  activeQueryClients.clear();
  appQueryClient.clear();
  setNowProvider(null);
  setApiAdapter(null);
  registerTokenProvider(async () => null);
}

export function createTestQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  activeQueryClients.add(client);
  return client;
}

export async function renderWithProviders(ui: ReactElement, queryClient: QueryClient = createTestQueryClient()) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = await render(ui, { wrapper: Wrapper });
  return { queryClient, ...rendered };
}

/** Real HTTP adapter (Axios + interceptors) wired to an offline fake REST server backed by `backend`. */
export function createHttpAdapterOverBackend(backend: ApiAdapter): ApiAdapter {
  const client = createApiClient('http://api.test');
  client.defaults.adapter = createFakeServerAdapter(backend);
  return createHttpAdapter(client);
}
