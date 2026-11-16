/**
 * Live exchange-rate feed helpers — pure functions (no fetch, no eval).
 *
 * The currency converter is offline-first: built-in indicative rates ship
 * with the app, the user may edit any rate (custom), and a server-side
 * proxy (/api/rates) can supply a live provider snapshot. This module
 * holds everything that decides how those three layers combine:
 *
 *   normalizeLiveRates — validates a provider/feed payload and reduces it
 *                        to a RateTable of the known currencies, quoted
 *                        per 1 USD, plus an as-of date.
 *   mergeRateTables    — overlay one table on another (overlay wins for
 *                        present, non-empty entries).
 *   applyLiveRates     — the precedence rule: custom edits always win,
 *                        otherwise a live snapshot replaces default/live.
 *
 * Rate provenance (RatesState) lives here too because it is pure data:
 *   default — built-in snapshot (DEFAULT_RATES_AS_OF)
 *   live    — a provider snapshot (liveAsOf = provider date,
 *             fetchedAt = when our proxy served it)
 *   custom  — the user edited at least one rate (editedAt = when)
 *
 * Validation returns a discriminated CalculationResult, never throws.
 */

import type { CalculationResult } from "../types";
import {
  CURRENCIES,
  DEFAULT_RATES,
  type RateTable,
} from "./currency-calculator";

// ── Rate provenance state ────────────────────────────────────

export type RatesSource = "default" | "live" | "custom";

export interface RatesState {
  /** Rates per 1 USD (built-in, live snapshot or user-edited). */
  rates: RateTable;
  /** Where the current table came from. */
  source: RatesSource;
  /** Epoch ms of the last user edit — null unless source is "custom". */
  editedAt: number | null;
  /** Provider snapshot date (ISO "YYYY-MM-DD") when source is "live". */
  liveAsOf: string | null;
  /** Epoch ms our proxy served the live table — null unless "live". */
  fetchedAt: number | null;
}

/** Stable starting state — the untouched built-in snapshot. */
export const DEFAULT_RATES_STATE: RatesState = {
  rates: DEFAULT_RATES,
  source: "default",
  editedAt: null,
  liveAsOf: null,
  fetchedAt: null,
};

// ── Normalized live payload ──────────────────────────────────

export interface NormalizedLiveRates {
  /** Known currencies only, per 1 USD, USD forced to "1". */
  rates: RateTable;
  /** Provider snapshot date as ISO "YYYY-MM-DD". */
  asOf: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): CalculationResult<NormalizedLiveRates> {
  return { ok: false, error: message };
}

/** Epoch ms / parseable date string → "YYYY-MM-DD" (UTC). */
function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Picks the as-of date from a payload, in order: an explicit `asOf`
 * (our own proxy response), the provider's unix timestamp, the
 * provider's RFC-style UTC string, then the caller's fallback.
 */
function extractAsOf(payload: Record<string, unknown>, fallback: string): string {
  const explicit = payload.asOf;
  if (typeof explicit === "string" && ISO_DATE.test(explicit)) return explicit;

  const unix = payload.time_last_update_unix;
  if (typeof unix === "number" && Number.isFinite(unix) && unix > 0) {
    return toIsoDate(unix * 1000);
  }

  const utc = payload.time_last_update_utc;
  if (typeof utc === "string") {
    const parsed = Date.parse(utc);
    if (Number.isFinite(parsed)) return toIsoDate(parsed);
  }

  return fallback;
}

/**
 * Validates a live-rate payload and reduces it to the app's rate shape.
 *
 * - `result`, when present, must be "success" (the provider's error
 *   envelope is rejected before touching rates).
 * - Only known currencies are kept; USD is always forced to "1".
 * - Entries that are missing, non-numeric or non-positive fall back to
 *   the built-in value so one bad currency never breaks the table.
 * - Fails when the payload has no usable known-currency rate at all.
 *
 * Pure: the payload is never mutated.
 */
export function normalizeLiveRates(
  payload: unknown,
  fallbackAsOf: string,
): CalculationResult<NormalizedLiveRates> {
  if (typeof payload !== "object" || payload === null) {
    return fail("Rate feed returned no rates");
  }
  const obj = payload as Record<string, unknown>;

  if (obj.result !== undefined && obj.result !== "success") {
    return fail("Rate feed returned an error");
  }

  const feed = obj.rates;
  if (typeof feed !== "object" || feed === null) {
    return fail("Rate feed returned no rates");
  }
  const feedRates = feed as Record<string, unknown>;

  const rates: RateTable = { USD: "1" };
  let matched = 0;

  for (const currency of CURRENCIES) {
    if (currency.id === "USD") continue;
    const raw = feedRates[currency.id];
    const value =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw.trim())
          : Number.NaN;
    if (Number.isFinite(value) && value > 0) {
      rates[currency.id] = String(value);
      matched += 1;
    } else {
      // Missing or unusable — keep the table complete with the built-in.
      rates[currency.id] = DEFAULT_RATES[currency.id];
    }
  }

  if (matched === 0) return fail("Rate feed returned no usable rates");

  return {
    ok: true,
    data: { rates, asOf: extractAsOf(obj, fallbackAsOf) },
  };
}

// ── Table combination ────────────────────────────────────────

/**
 * Overlay one table on another: every present, non-empty overlay entry
 * wins; the base covers anything the overlay lacks. Never mutates.
 */
export function mergeRateTables(base: RateTable, overlay: RateTable): RateTable {
  const merged: RateTable = { ...base };
  for (const [id, value] of Object.entries(overlay)) {
    if (typeof value === "string" && value.trim()) merged[id] = value;
  }
  return merged;
}

/**
 * The precedence rule for a successful live snapshot:
 *   custom  → unchanged (the user's edits always win)
 *   default / live → live rates merged in, provenance flips to "live".
 *
 * `fetchedAt` records when the snapshot was served; `liveAsOf` comes
 * from the provider payload itself.
 */
export function applyLiveRates(
  current: RatesState,
  live: NormalizedLiveRates,
  fetchedAt: number,
): RatesState {
  if (current.source === "custom") return current;
  return {
    rates: mergeRateTables(current.rates, live.rates),
    source: "live",
    editedAt: null,
    liveAsOf: live.asOf,
    fetchedAt,
  };
}
