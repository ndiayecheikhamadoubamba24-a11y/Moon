import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Petites données JSON (cache, file de synchro). */
export const store = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  async set(key: string, value: unknown) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // stockage plein ou indisponible : on ignore, l'app reste utilisable
    }
  },
  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  },
  async clearAll() {
    await AsyncStorage.clear();
  },
};

/** Données sensibles (jeton, code PIN) : trousseau chiffré du téléphone. */
export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(`secure:${key}`);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(`secure:${key}`, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(`secure:${key}`);
    return SecureStore.deleteItemAsync(key);
  },
};
