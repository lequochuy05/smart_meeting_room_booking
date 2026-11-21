import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type { ApiAdapter } from '@/shared/api/types';
import { AppError } from '@/shared/api/types';

const STATUS_BY_CODE: Record<string, number> = {
  NETWORK_ERROR: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  PAST_TIME: 422,
  BOOKING_CONFLICT: 409,
  INVALID_STATE: 409,
  CHECK_IN_WINDOW_CLOSED: 409,
  CANCELLATION_NOT_ALLOWED: 409,
};

/**
 * Axios transport that behaves like the REST API in contracts/mobile-api.md by
 * routing each request to a backing adapter. It lets contract tests run the
 * real HTTP adapter (paths, params, interceptors, error normalization) offline.
 */
export function createFakeServerAdapter(backend: ApiAdapter): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toUpperCase();
    const path = (config.url ?? '').replace(config.baseURL ?? '', '');
    const params = (config.params ?? {}) as Record<string, unknown>;
    const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {});

    const respond = (data: unknown, status = 200): AxiosResponse => ({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    });

    try {
      let match: RegExpMatchArray | null;
      if (method === 'POST' && path === '/auth/login') return respond(await backend.login(body));
      if (method === 'POST' && path === '/auth/logout') return respond(await backend.logout(), 204);
      if (method === 'GET' && path === '/auth/me') return respond(await backend.getCurrentEmployee());
      if (method === 'GET' && path === '/rooms') return respond(await backend.listRooms(params));
      if (method === 'GET' && path === '/equipment') return respond(await backend.listEquipment());
      if (method === 'GET' && path === '/employees/search') {
        return respond(await backend.searchEmployees(String(params.query ?? '')));
      }
      if (method === 'GET' && path === '/bookings/mine') {
        return respond(await backend.listMyBookings(params.status === 'past' ? 'past' : 'upcoming'));
      }
      if (method === 'POST' && path === '/bookings') return respond(await backend.createBooking(body), 201);
      if (method === 'GET' && (match = path.match(/^\/rooms\/([^/]+)\/schedule$/))) {
        return respond(await backend.getRoomSchedule(decodeURIComponent(match[1]), String(params.date)));
      }
      if (method === 'GET' && (match = path.match(/^\/rooms\/([^/]+)$/))) {
        return respond(await backend.getRoom(decodeURIComponent(match[1])));
      }
      if (method === 'POST' && (match = path.match(/^\/bookings\/([^/]+)\/check-in$/))) {
        return respond(await backend.checkIn(decodeURIComponent(match[1])));
      }
      if (method === 'POST' && (match = path.match(/^\/bookings\/([^/]+)\/cancel$/))) {
        return respond(await backend.cancelBooking(decodeURIComponent(match[1])));
      }
      throw new AppError('NOT_FOUND', `No route for ${method} ${path}`, { status: 404 });
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === 'NETWORK_ERROR') {
          throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
        }
        if (error.code === 'TIMEOUT') {
          throw new AxiosError('timeout', AxiosError.ECONNABORTED, config);
        }
        const status = error.status ?? STATUS_BY_CODE[error.code] ?? 500;
        throw new AxiosError(error.message, AxiosError.ERR_BAD_REQUEST, config, undefined, {
          data: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
          status,
          statusText: String(status),
          headers: {},
          config,
        });
      }
      throw error;
    }
  };
}
