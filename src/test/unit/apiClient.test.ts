import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { registerTokenProvider, registerUnauthorizedHandler } from '@/shared/api/authToken';
import { createApiClient, normalizeAxiosError } from '@/shared/api/client';
import { AppError } from '@/shared/api/types';

describe('API client and error normalization', () => {
  afterEach(() => {
    registerTokenProvider(async () => null);
    registerUnauthorizedHandler(() => undefined);
  });

  it('attaches the SecureStore-backed Bearer token on outgoing requests', async () => {
    registerTokenProvider(async () => 'secret-session-token');
    const client = createApiClient('http://api.test');
    let capturedAuth: unknown;
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      capturedAuth = config.headers.get('Authorization');
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await client.get('/rooms');
    expect(capturedAuth).toBe('Bearer secret-session-token');
  });

  it('notifies the unauthorized handler and normalizes 401 responses', async () => {
    const onUnauthorized = jest.fn();
    registerUnauthorizedHandler(onUnauthorized);
    const client = createApiClient('http://api.test');
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
        data: { code: 'UNAUTHORIZED', message: 'Session expired' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      });
    };

    const error = await client.get('/auth/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('UNAUTHORIZED');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('normalizes timeout, network, and field validation errors consistently', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const timeout = normalizeAxiosError(new AxiosError('timeout', 'ECONNABORTED', config));
    expect(timeout.code).toBe('TIMEOUT');
    expect(timeout.isRetryable).toBe(true);

    const offline = normalizeAxiosError(new AxiosError('Network Error', 'ERR_NETWORK', config));
    expect(offline.code).toBe('NETWORK_ERROR');
    expect(offline.isRetryable).toBe(true);

    const conflict = normalizeAxiosError(
      new AxiosError('Conflict', AxiosError.ERR_BAD_REQUEST, config, undefined, {
        data: { code: 'BOOKING_CONFLICT', message: 'Already booked', fieldErrors: { startTime: 'Overlap' } },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config,
      }),
    );
    expect(conflict.code).toBe('BOOKING_CONFLICT');
    expect(conflict.fieldErrors).toEqual({ startTime: 'Overlap' });
    expect(conflict.isRetryable).toBe(false);
  });
});
