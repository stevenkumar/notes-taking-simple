/**
 * Favourites & recent-tool preferences (PRD §8, local-first).
 *
 * Two tiny lists persisted under the existing namespaced storage keys:
 *   - favourites: user-starred calculators, in toggle order
 *   - recent tools: most-recently-visited calculators, newest first
 *
 * Every load validates against the calculator registry, so stale ids
 * from removed tools are dropped instead of rendering ghost entries.
 * The pure helpers (toggleFavouriteIn / pushRecentIn) are separated from
 * the storage wrappers so ordering and capping rules stay unit-testable
 * without a browser.
 */

import { getStorage, setStorage, STORAGE_KEYS } from "./storage";
import { CALCULATORS } from "@/modules/calculator/registry/calculator-registry";
import type { CalculatorId } from "@/modules/calculator/types";

/** Recent tools kept for the dashboard (newest first, capped). */
export const MAX_RECENT_TOOLS = 8;

/** Quick-access row length on the dashboard (favourites first). */
export const MAX_QUICK_TOOLS = 6;

const VALID_IDS = new Set<string>(CALCULATORS.map((c) => c.id));

/** Keep only strings that still exist in the registry, preserving order. */
function sanitiseIds(value: unknown): CalculatorId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is CalculatorId =>
      typeof id === "string" && VALID_IDS.has(id),
  );
}

// ── Pure list logic ──────────────────────────────────────────

/** Add the id when absent, remove it when present (order otherwise kept). */
export function toggleFavouriteIn(
  list: CalculatorId[],
  id: CalculatorId,
): CalculatorId[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/**
 * Move the id to the front (deduped) and cap the list — visiting a tool
 * twice should not create two entries, and the oldest falls off.
 */
export function pushRecentIn(
  list: CalculatorId[],
  id: CalculatorId,
  max: number = MAX_RECENT_TOOLS,
): CalculatorId[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

// ── Favourites (storage-backed) ──────────────────────────────

export function loadFavourites(): CalculatorId[] {
  return sanitiseIds(getStorage<unknown>(STORAGE_KEYS.favourites, []));
}

/** Toggle one favourite, persist the new list and return it. Unknown ids are ignored. */
export function toggleFavourite(id: CalculatorId): CalculatorId[] {
  if (!VALID_IDS.has(id)) return loadFavourites();
  const next = toggleFavouriteIn(loadFavourites(), id);
  setStorage(STORAGE_KEYS.favourites, next);
  return next;
}

// ── Recent tools (storage-backed) ────────────────────────────

export function loadRecentTools(): CalculatorId[] {
  return sanitiseIds(getStorage<unknown>(STORAGE_KEYS.recentTools, []));
}

/** Record a tool visit: newest first, deduped, capped. Unknown ids are ignored. */
export function recordRecentTool(id: CalculatorId): CalculatorId[] {
  if (!VALID_IDS.has(id)) return loadRecentTools();
  const next = pushRecentIn(loadRecentTools(), id);
  setStorage(STORAGE_KEYS.recentTools, next);
  return next;
}
