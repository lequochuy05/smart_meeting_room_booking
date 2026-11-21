import { clearSession, loadSession, saveSession } from '@/features/auth/services/sessionStorage';
import { employeeSchema, loginSchema, sessionSchema, type Employee, type LoginCredentials, type Session } from '@/features/auth/types/auth';
import { getApiAdapter } from '@/shared/api';
import { AppError } from '@/shared/api/types';

export async function login(credentials: LoginCredentials): Promise<Session> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    throw new AppError('VALIDATION_ERROR', 'Please correct the highlighted fields.', { fieldErrors });
  }
  const session = sessionSchema.parse(await getApiAdapter().login(parsed.data));
  await saveSession(session);
  return session;
}

/** Best-effort server logout; local credentials are always cleared. */
export async function logout(): Promise<void> {
  try {
    await getApiAdapter().logout();
  } catch {
    // Server unreachable: the local session is still removed.
  } finally {
    await clearSession();
  }
}

export async function getCurrentEmployee(): Promise<Employee> {
  return employeeSchema.parse(await getApiAdapter().getCurrentEmployee());
}

/** Restores the stored session and confirms it with the server. */
export async function restoreSession(): Promise<Session | null> {
  const stored = await loadSession();
  if (!stored) return null;
  try {
    const employee = await getCurrentEmployee();
    return { token: stored.token, employee };
  } catch (error) {
    if (error instanceof AppError && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')) {
      // Offline: trust the stored employee so the app remains usable; the server revalidates mutations.
      return stored;
    }
    await clearSession();
    return null;
  }
}
