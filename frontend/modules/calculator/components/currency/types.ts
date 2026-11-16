/**
 * Currency Converter — form state and rate-table persistence types.
 * Forms hold raw strings (controlled inputs); compute.ts validates the
 * amount and passes the current rate table to the engine.
 *
 * Rate provenance (RatesState, DEFAULT_RATES_STATE) lives in the
 * live-rates engine — re-exported here so existing imports keep working.
 */

export {
  DEFAULT_RATES_STATE,
  type RatesSource,
  type RatesState,
} from "../../engine/live-rates";

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

/** localStorage key for the persisted rate table (custom edits only). */
export const RATES_STORAGE_KEY = "everyday:currency-rates";
