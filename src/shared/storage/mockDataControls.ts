import { getMockAdapter } from '@/shared/api';
import type { FailureMode } from '@/shared/api/mockAdapter';
import { queryClient } from '@/shared/api/queryClient';

/** Whether the standalone adapter is active (controls are meaningless against a real API). */
export function isStandaloneMode(): boolean {
  return getMockAdapter() !== null;
}

/** Re-seeds persisted standalone data relative to now and refetches everything. */
export async function resetMockData(): Promise<void> {
  const adapter = getMockAdapter();
  if (!adapter) return;
  await adapter.controls.resetData();
  await queryClient.invalidateQueries();
}

export function setSimulatedFailure(mode: FailureMode): void {
  getMockAdapter()?.controls.setFailureMode(mode);
}

export function getSimulatedFailure(): FailureMode {
  return getMockAdapter()?.controls.getFailureMode() ?? 'none';
}
