import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../types';

const TOKEN_KEY = 'daltaners_auth_tokens';
const USER_KEY = 'daltaners_user';

export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser<T>(user: T): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
