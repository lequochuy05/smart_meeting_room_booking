import Constants from 'expo-constants';

export type AdapterKind = 'mock' | 'http';

interface ExtraConfig {
  apiAdapter?: string;
  apiBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function resolveAdapterKind(value: string | undefined): AdapterKind {
  return value === 'http' ? 'http' : 'mock';
}

/**
 * Runtime configuration. `EXPO_PUBLIC_*` environment variables take precedence
 * over the defaults in `app.json` (`expo.extra`).
 *
 * - `EXPO_PUBLIC_API_ADAPTER=mock|http`
 * - `EXPO_PUBLIC_API_BASE_URL=https://api.example.com`
 */
export const apiConfig = {
  adapter: resolveAdapterKind(process.env.EXPO_PUBLIC_API_ADAPTER ?? extra.apiAdapter),
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'http://localhost:3000',
  timeoutMs: 10_000,
} as const;
