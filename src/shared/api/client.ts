import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { apiConfig } from '@/shared/api/config';
import { getAuthToken, notifyUnauthorized } from '@/shared/api/authToken';
import { AppError, type ApiErrorBody, type ErrorCode } from '@/shared/api/types';

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'BOOKING_CONFLICT',
  422: 'VALIDATION_ERROR',
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

/** Converts any transport failure into the normalized `AppError`. */
export function normalizeAxiosError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (!axios.isAxiosError(error)) {
    return new AppError('UNKNOWN', error instanceof Error ? error.message : 'Something went wrong.');
  }
  const axiosError = error as AxiosError;
  if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
    return new AppError('TIMEOUT', 'The request timed out. Check your connection and try again.');
  }
  if (!axiosError.response) {
    return new AppError('NETWORK_ERROR', 'Network unavailable. Check your connection and try again.');
  }
  const { status, data } = axiosError.response;
  if (isApiErrorBody(data)) {
    return new AppError(data.code, data.message, { fieldErrors: data.fieldErrors, status });
  }
  const code: ErrorCode = STATUS_CODES[status] ?? (status >= 500 ? 'UNKNOWN' : 'UNKNOWN');
  return new AppError(code, 'The request could not be completed. Please try again.', { status });
}

export function createApiClient(baseURL: string = apiConfig.baseUrl): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: apiConfig.timeoutMs,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalized = normalizeAxiosError(error);
      if (normalized.code === 'UNAUTHORIZED') notifyUnauthorized();
      return Promise.reject(normalized);
    },
  );

  return client;
}

export const apiClient = createApiClient();
