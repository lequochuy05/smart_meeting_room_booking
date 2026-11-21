import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiConfig } from '@/shared/api/config';
import { createHttpAdapter } from '@/shared/api/httpAdapter';
import { createMockAdapter, type MockApiAdapter } from '@/shared/api/mockAdapter';
import type { ApiAdapter } from '@/shared/api/types';

let adapter: ApiAdapter | null = null;

function createConfiguredAdapter(): ApiAdapter {
  if (apiConfig.adapter === 'http') return createHttpAdapter();
  return createMockAdapter({ storage: AsyncStorage, latencyMs: 250 });
}

/** Single place where the runtime transport is chosen. Features never import adapters directly. */
export function getApiAdapter(): ApiAdapter {
  if (!adapter) adapter = createConfiguredAdapter();
  return adapter;
}

/** Overrides the adapter (tests, storybook-style tooling). Pass null to reset. */
export function setApiAdapter(next: ApiAdapter | null): void {
  adapter = next;
}

export function isMockAdapter(candidate: ApiAdapter): candidate is MockApiAdapter {
  return 'controls' in candidate;
}

export function getMockAdapter(): MockApiAdapter | null {
  const current = getApiAdapter();
  return isMockAdapter(current) ? current : null;
}
