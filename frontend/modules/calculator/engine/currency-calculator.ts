/**
 * Currency Converter – calculation engine.
 *
 * Offline-first by design (local-first app): a built-in indicative rate
 * table ships with the engine and the UI lets the user edit any rate,
 * persisting custom rates locally. No network, no `eval`, no mutation —
 * pure functions with decimal arithmetic (decimal.js) per PRD §14.
 *
 * Rate model: every rate is quoted per 1 USD (the table base), so any
 * pair converts as amount × rate[to] ÷ rate[from]. The base rate for USD
 * itself is fixed at "1".
 *
 * Rounding policy (documented, tested):
 *   - Money results use each currency's minor units: 2dp half-up for most
 *     currencies (INR, USD, EUR, …), 0dp for zero-decimal currencies
 *     (JPY, KRW). Fixed decimals are kept ("8850.00") — money convention.
 *   - Rate lines use 6 significant digits with trailing zeros stripped
 *     ("1 USD = 88.5 INR").
 *
 * Validation returns a discriminated CalculationResult, never throws.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared idempotent config (precision far beyond any conversion need).
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Types ────────────────────────────────────────────────────

export interface CurrencyDef {
  id: string;
  name: string;
  /** Symbol shown next to amounts, e.g. "₹". */
  symbol: string;
  /** Digits after the decimal point when formatting money. */
  minorUnits: 0 | 2;
}

/** Rates quoted per 1 USD; USD is fixed at "1". */
export type RateTable = Record<string, string>;

// ── Currency registry ────────────────────────────────────────

export const CURRENCIES: CurrencyDef[] = [
  { id: "USD", name: "US Dollar", symbol: "$", minorUnits: 2 },
  { id: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
  { id: "EUR", name: "Euro", symbol: "€", minorUnits: 2 },
  { id: "GBP", name: "British Pound", symbol: "£", minorUnits: 2 },
  { id: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0 },
  { id: "KRW", name: "South Korean Won", symbol: "₩", minorUnits: 0 },
  { id: "AUD", name: "Australian Dollar", symbol: "A$", minorUnits: 2 },
  { id: "CAD", name: "Canadian Dollar", symbol: "C$", minorUnits: 2 },
  { id: "CHF", name: "Swiss Franc", symbol: "CHF", minorUnits: 2 },
  { id: "CNY", name: "Chinese Yuan", symbol: "CN¥", minorUnits: 2 },
  { id: "AED", name: "UAE Dirham", symbol: "د.إ", minorUnits: 2 },
  { id: "SGD", name: "Singapore Dollar", symbol: "S$", minorUnits: 2 },
];

/**
 * Built-in indicative snapshot (per 1 USD). Clearly labelled as
 * indicative in the UI — users are expected to edit rates to match
 * their own source, which flips the freshness badge to "custom".
 */
export const DEFAULT_RATES: RateTable = {
  USD: "1",
  INR: "88.5",
  EUR: "0.92",
  GBP: "0.79",
  JPY: "152",
  KRW: "1380",
  AUD: "1.52",
  CAD: "1.37",
  CHF: "0.88",
  CNY: "7.15",
  AED: "3.67",
  SGD: "1.34",
};

/** Date of the built-in snapshot — shown by the freshness badge. */
export const DEFAULT_RATES_AS_OF = "2026-11-01";

// ── Lookups ──────────────────────────────────────────────────

export function getCurrency(id: string): CurrencyDef | undefined {
  return CURRENCIES.find((c) => c.id === id);
}

// ── Formatting ───────────────────────────────────────────────

/** Money: fixed decimals per currency, explicit half-up ("8850.00", "7600"). */
export function formatMoney(value: Decimal, minorUnits: 0 | 2): string {
  return value.toDecimalPlaces(minorUnits, Decimal.ROUND_HALF_UP).toFixed(minorUnits);
}

/** Rate lines: 6 significant digits, trailing zeros stripped. */
export function formatRate(value: Decimal): string {
  if (value.isZero()) return "0";
  let out = value.toSignificantDigits(6).toString();
  if (out.includes(".") && !out.toLowerCase().includes("e")) {
    out = out.replace(/0+$/, "").replace(/\.$/, "");
  }
  return out;
}

// ── Rate validation ──────────────────────────────────────────

/**
 * Validates one editable rate string (non-USD). Returns an error
 * message for empty / non-finite / non-positive input, else null.
 */
export function validateRate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter a rate";
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return "Enter a valid number";
  if (value <= 0) return "Rate must be greater than 0";
  return null;
}

/** Parses a rate string for math; null when unusable. */
function parseRate(raw: string | undefined): Decimal | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Decimal(trimmed);
}

// ── Conversion ───────────────────────────────────────────────

export interface ConvertCurrencyInputs {
  amount: number;
  from: string;
  to: string;
  /** Rates per 1 USD (defaults or user-edited). */
  rates: RateTable;
}

export interface CurrencyResult {
  amount: number;
  from: CurrencyDef;
  to: CurrencyDef;
  /** Money string at the target currency's minor units. */
  result: string;
  /** "1 USD = 88.5 INR" style line for from → to. */
  rateLine: string;
  /** The same line for to → from. */
  inverseLine: string;
  /** Raw conversion before money rounding (for tests / precision). */
  raw: Decimal;
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

export function convertCurrency(
  inputs: ConvertCurrencyInputs,
): CalculationResult<CurrencyResult> {
  const { amount, from: fromId, to: toId, rates } = inputs;

  const from = getCurrency(fromId);
  if (!from) return fail("Unknown currency", "from");
  const to = getCurrency(toId);
  if (!to) return fail("Unknown currency", "to");

  if (!Number.isFinite(amount)) return fail("Enter a valid amount", "amount");
  if (amount < 0) return fail("Amount cannot be negative", "amount");

  const fromRate = parseRate(rates[fromId]);
  if (!fromRate) return fail(`Enter a valid rate for ${fromId}`, "rates");
  const toRate = parseRate(rates[toId]);
  if (!toRate) return fail(`Enter a valid rate for ${toId}`, "rates");

  const dec = new Decimal(String(amount));
  const raw = fromId === toId ? dec : dec.times(toRate).div(fromRate);

  const pairRate = fromId === toId ? new Decimal(1) : toRate.div(fromRate);
  const inverse = fromId === toId ? new Decimal(1) : fromRate.div(toRate);

  return {
    ok: true,
    data: {
      amount,
      from,
      to,
      result: formatMoney(raw, to.minorUnits),
      rateLine: `1 ${from.id} = ${formatRate(pairRate)} ${to.id}`,
      inverseLine: `1 ${to.id} = ${formatRate(inverse)} ${from.id}`,
      raw,
    },
  };
}
