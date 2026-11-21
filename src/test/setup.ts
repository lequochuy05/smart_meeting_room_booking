import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { notifyManager } from '@tanstack/react-query';

// Flush TanStack Query notifications synchronously in tests so no untracked
// setTimeout(0) callbacks fire outside act() or after a worker exits.
notifyManager.setScheduler((callback) => {
  callback();
});

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiAdapter: 'mock', apiBaseUrl: 'http://localhost:3000' } } },
}));

require('@shopify/flash-list/jestSetup');
