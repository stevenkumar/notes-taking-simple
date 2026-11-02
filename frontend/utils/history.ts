/**
 * Local calculation history helpers (PRD §8).
 * Storage is browser-local (localStorage) until cloud sync arrives in Phase 7.
 */

import { getStorage, setStorage, STORAGE_KEYS } from "./storage";
import type { CalculatorId, HistoryEntry } from "@/modules/calculator/types";

/** Load history entries, optionally filtered to one calculator. */
export function loadHistory(calculatorId?: CalculatorId): HistoryEntry[] {
  const all = getStorage<HistoryEntry[]>(STORAGE_KEYS.history, []);
  return calculatorId ? all.filter((h) => h.calculatorId === calculatorId) : all;
}

function uniqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Prepend a new entry and cap the list at 100 entries. */
export function addHistoryEntry(
  entry: Omit<HistoryEntry, "id" | "createdAt">,
): HistoryEntry {
  const all = getStorage<HistoryEntry[]>(STORAGE_KEYS.history, []);
  const newEntry: HistoryEntry = {
    ...entry,
    id: uniqueId(),
    createdAt: Date.now(),
  };
  setStorage(STORAGE_KEYS.history, [newEntry, ...all].slice(0, 100));
  return newEntry;
}

/** Delete one entry by id. */
export function removeHistoryEntry(id: string): void {
  const all = getStorage<HistoryEntry[]>(STORAGE_KEYS.history, []);
  setStorage(
    STORAGE_KEYS.history,
    all.filter((h) => h.id !== id),
  );
}

/** Relative timestamp for history lists, e.g. "just now", "5m ago", "2d ago". */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
