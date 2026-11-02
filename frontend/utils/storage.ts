/**
 * Safe localStorage wrappers with JSON serialization and error handling.
 * All app storage keys are namespaced under "everyday:".
 */

const PREFIX = "everyday:";

/** Namespaced storage keys used across the app. */
export const STORAGE_KEYS = {
  theme: "everyday-theme",
  recentTools: `${PREFIX}recent-tools`,
  favourites: `${PREFIX}favourites`,
  history: `${PREFIX}history`,
  savedCalculations: `${PREFIX}saved-calculations`,
  preferences: `${PREFIX}preferences`,
} as const;

/** Read and parse a JSON value from localStorage. Returns fallback on any error. */
export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialize and write a value to localStorage. Silently fails if unavailable. */
export function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled
  }
}

/** Remove a key from localStorage. */
export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Check whether localStorage is available in the current environment. */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = `${PREFIX}__test__`;
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
