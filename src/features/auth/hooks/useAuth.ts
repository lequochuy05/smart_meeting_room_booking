import { create } from 'zustand';

import * as authService from '@/features/auth/services/authService';
import { getSessionToken } from '@/features/auth/services/sessionStorage';
import type { Employee, LoginCredentials } from '@/features/auth/types/auth';
import { registerTokenProvider, registerUnauthorizedHandler } from '@/shared/api/authToken';
import { queryClient } from '@/shared/api/queryClient';
import { toAppError, type AppError } from '@/shared/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  employee: Employee | null;
  error: AppError | null;
  isSubmitting: boolean;
  hydrate: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  employee: null,
  error: null,
  isSubmitting: false,

  async hydrate() {
    set({ status: 'loading', error: null });
    try {
      const session = await authService.restoreSession();
      set(
        session
          ? { status: 'authenticated', employee: session.employee }
          : { status: 'unauthenticated', employee: null },
      );
    } catch (error) {
      set({ status: 'unauthenticated', employee: null, error: toAppError(error) });
    }
  },

  async login(credentials) {
    set({ isSubmitting: true, error: null });
    try {
      const session = await authService.login(credentials);
      queryClient.clear();
      set({ status: 'authenticated', employee: session.employee, isSubmitting: false });
      return true;
    } catch (error) {
      set({ isSubmitting: false, error: toAppError(error) });
      return false;
    }
  },

  async logout() {
    set({ isSubmitting: true });
    await authService.logout();
    // Reset authenticated server state so nothing leaks to the next session.
    queryClient.clear();
    set({ status: 'unauthenticated', employee: null, isSubmitting: false, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));

/** Wires SecureStore-backed credentials into the transport layer. Call once at app start. */
export function configureAuthTransport(): void {
  registerTokenProvider(getSessionToken);
  registerUnauthorizedHandler(() => {
    if (useAuth.getState().status === 'authenticated') {
      void useAuth.getState().logout();
    }
  });
}
