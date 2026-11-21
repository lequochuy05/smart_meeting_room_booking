import { getMockAdapter } from '@/shared/api';

/** Shows demo credentials only while the standalone adapter is active. */
export function isMockHint(): boolean {
  return getMockAdapter() !== null;
}
