/**
 * Currency Converter — form state and rate-table persistence types.
 * Forms hold raw strings (controlled inputs); compute.ts validates the
 * amount and passes the current rate table to the engine.
 */

import { DEFAULT_RATES, type RateTable } from "../../engine/currency-calculator";

export interface CurrencyForm {
  /** Raw amount string being converted. */
  amount: string;
  from: string;
  to: string;
}

/** Stable initial state — 100 USD → INR shows a live result on first paint. */
export const CURRENCY_INITIAL_FORM: CurrencyForm = {
  amount: "100",
  from: "USD",
  to: "INR",
};

// ── Rate table state ────────────────────────────────────────

export type RatesSource = "default" | "custom";

export interface RatesState {
  /** Rates per 1 USD (defaults or user-edited). */
  rates: RateTable;
  /** "default" = built-in snapshot, "custom" = user has edited a rate. */
  source: RatesSource;
  /** Epoch ms of the last edit — null for the untouched default table. */
  editedAt: number | null;
}

export const DEFAULT_RATES_STATE: RatesState = {
  rates: DEFAULT_RATES,
  source: "default",
  editedAt: null,
};

/** localStorage key for the persisted rate table. */
export const RATES_STORAGE_KEY = "everyday:currency-rates";
