import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { sessionSchema, type Session } from '@/features/auth/types/auth';

const SESSION_KEY = 'smartroom.session';

/**
 * Session credentials live in Expo SecureStore. SecureStore is unavailable on
 * web, where the development-only fallback uses AsyncStorage (localStorage).
 */
async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const value = JSON.stringify(session);
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  } else {
    await AsyncStorage.setItem(SESSION_KEY, value);
  }
}

export async function loadSession(): Promise<Session | null> {
  const raw = (await canUseSecureStore())
    ? await SecureStore.getItemAsync(SESSION_KEY)
    : await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  return (await loadSession())?.token ?? null;
}

export async function clearSession(): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}
