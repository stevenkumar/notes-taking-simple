/**
 * Profit & Loss Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. Profit or Loss      — cost price + selling price → profit/loss
 *                            amount, profit % on cost (markup) and
 *                            margin % on selling price, with a
 *                            profit / loss / break-even verdict
 *   B. Find Selling Price  — cost price + a rate on either basis
 *                            (markup on cost or margin on selling
 *                            price) → selling price and both rates
 *   C. Find Cost Price     — selling price + a rate on either basis
 *                            → cost price and both rates
 *
 * Vocabulary:
 *   markup %  = profit ÷ cost price × 100   (profit on cost)
 *   margin %  = profit ÷ selling price × 100 (profit on revenue)
 *
 * Rounding policy (same as the EMI/interest/salary engines):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - Percent outputs round to 2dp and are computed from the ROUNDED
 *     money values, so recovered rates match what the UI displayed.
 *   - Mode B/C invert the rate formula from the rounded amount.
 *
 * Validation: every function returns a discriminated CalculationResult —
 * never throws, never uses eval.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared config — idempotent with the other engines' call.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Helpers ──────────────────────────────────────────────────

/** Convert a JS number/Decimal to Decimal safely (via str to avoid float artifacts). */
function dec(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(typeof value === "number" ? String(value) : value);
}

/** Round to 2 decimal places, half-up. Used for all money outputs. */
function round2(value: Decimal | number): number {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

function requirePositive(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value <= 0) return fail(`${label} must be greater than 0`, field);
  return null;
}

// ── Rate basis vocabulary ────────────────────────────────────

/** Which base a rate applies to: markup on cost, or margin on selling price. */
export type RateBasis = "markup" | "margin";

/** UI options for the basis pills (value → human label). */
export const RATE_BASIS_OPTIONS: Array<{ value: RateBasis; label: string }> = [
  { value: "markup", label: "Markup on cost" },
  { value: "margin", label: "Margin on selling price" },
];

/** Human label for a rate basis. */
export function rateBasisLabel(basis: RateBasis): string {
  return RATE_BASIS_OPTIONS.find((o) => o.value === basis)?.label ?? basis;
}

/** Common profit-rate chips for the UI (%). */
export const PROFIT_RATE_PRESETS = [10, 20, 30, 50] as const;

/** Validate the rate for a given basis: non-negative, and margin < 100%. */
function requireRate(rate: number, basis: RateBasis): CalculationError | null {
  const label = basis === "markup" ? "Markup %" : "Margin %";
  const field = "rate";
  if (!Number.isFinite(rate)) return fail(`${label} must be a valid number`, field);
  if (rate < 0) return fail(`${label} cannot be negative`, field);
  if (basis === "margin" && rate >= 100) {
    return fail("Margin % must be less than 100", field);
  }
  return null;
}

/** markup % = profit ÷ CP × 100, margin % = profit ÷ SP × 100 (both 2dp). */
function ratePair(
  profit: Decimal,
  costPrice: Decimal,
  sellingPrice: Decimal,
): { markupPercent: number; marginPercent: number } {
  return {
    markupPercent: round2(profit.div(costPrice).times(100)),
    marginPercent: round2(profit.div(sellingPrice).times(100)),
  };
}

// ── Mode A: Profit or Loss ────────────────────────────────────

export interface ProfitLossInputs {
  /** Cost price in ₹ — must be greater than 0. */
  costPrice: number;
  /** Selling price in ₹ — must be greater than 0. */
  sellingPrice: number;
}

export interface ProfitLossResult {
  costPrice: number;
  sellingPrice: number;
  /** sellingPrice − costPrice: positive = profit, negative = loss. */
  profitAmount: number;
  /** "profit" when SP > CP, "loss" when SP < CP, else "break-even". */
  outcome: "profit" | "loss" | "break-even";
  /** profit ÷ cost price × 100 — the markup on cost (signed, 2dp). */
  profitPercent: number;
  /** profit ÷ selling price × 100 — the margin on revenue (signed, 2dp). */
  marginPercent: number;
}

/**
 * CP + SP → verdict. Percentages derive from the rounded money values
 * so the displayed rates are exactly what the amounts imply.
 */
export function calculateProfitLoss(
  inputs: ProfitLossInputs,
): CalculationResult<ProfitLossResult> {
  const e = requirePositive(inputs.costPrice, "costPrice", "Cost price");
  if (e) return e;
  const e2 = requirePositive(inputs.sellingPrice, "sellingPrice", "Selling price");
  if (e2) return e2;

  const costPrice = round2(inputs.costPrice);
  const sellingPrice = round2(inputs.sellingPrice);
  const profit = dec(sellingPrice).minus(costPrice);
  const profitAmount = round2(profit);
  const outcome =
    profitAmount > 0 ? "profit" : profitAmount < 0 ? "loss" : "break-even";
  const { markupPercent, marginPercent } = ratePair(
    profit,
    dec(costPrice),
    dec(sellingPrice),
  );

  return {
    ok: true,
    data: {
      costPrice,
      sellingPrice,
      profitAmount,
      outcome,
      profitPercent: markupPercent,
      marginPercent,
    },
  };
}

// ── Mode B: Find Selling Price ───────────────────────────────

export interface SellingPriceInputs {
  /** Cost price in ₹ — must be greater than 0. */
  costPrice: number;
  /** Desired rate in % — markup (≥ 0) or margin (0–99.99). */
  rate: number;
  /** Which base the rate applies to. */
  basis: RateBasis;
}

export interface SellingPriceResult {
  costPrice: number;
  rate: number;
  basis: RateBasis;
  /** Rounded selling price. */
  sellingPrice: number;
  /** sellingPrice − costPrice (≥ 0 for valid rates). */
  profitAmount: number;
  /** profit ÷ cost price × 100 (2dp) — recovers the input on markup basis. */
  markupPercent: number;
  /** profit ÷ selling price × 100 (2dp) — recovers the input on margin basis. */
  marginPercent: number;
}

/**
 * markup basis: SP = CP × (1 + m ÷ 100)
 * margin basis: SP = CP ÷ (1 − g ÷ 100)   (g < 100, guarded)
 */
export function calculateSellingPrice(
  inputs: SellingPriceInputs,
): CalculationResult<SellingPriceResult> {
  const e = requirePositive(inputs.costPrice, "costPrice", "Cost price");
  if (e) return e;
  const e2 = requireRate(inputs.rate, inputs.basis);
  if (e2) return e2;

  const costPrice = round2(inputs.costPrice);
  const rateFactor =
    inputs.basis === "markup"
      ? dec(1).plus(dec(inputs.rate).div(100))
      : dec(1).minus(dec(inputs.rate).div(100));
  // markup: SP = CP × (1 + m/100); margin: SP = CP ÷ (1 − g/100)
  const sellingPrice = round2(
    inputs.basis === "markup"
      ? dec(costPrice).times(rateFactor)
      : dec(costPrice).div(rateFactor),
  );
  const profit = dec(sellingPrice).minus(costPrice);
  const profitAmount = round2(profit);
  const { markupPercent, marginPercent } = ratePair(
    profit,
    dec(costPrice),
    dec(sellingPrice),
  );

  return {
    ok: true,
    data: {
      costPrice,
      rate: inputs.rate,
      basis: inputs.basis,
      sellingPrice,
      profitAmount,
      markupPercent,
      marginPercent,
    },
  };
}

// ── Mode C: Find Cost Price ──────────────────────────────────

export interface CostPriceInputs {
  /** Selling price in ₹ — must be greater than 0. */
  sellingPrice: number;
  /** Desired rate in % — markup (≥ 0) or margin (0–99.99). */
  rate: number;
  /** Which base the rate applies to. */
  basis: RateBasis;
}

export interface CostPriceResult {
  sellingPrice: number;
  rate: number;
  basis: RateBasis;
  /** Rounded cost price. */
  costPrice: number;
  /** sellingPrice − costPrice (≥ 0 for valid rates). */
  profitAmount: number;
  /** profit ÷ cost price × 100 (2dp). */
  markupPercent: number;
  /** profit ÷ selling price × 100 (2dp). */
  marginPercent: number;
}

/**
 * markup basis: CP = SP ÷ (1 + m ÷ 100)
 * margin basis: CP = SP × (1 − g ÷ 100)
 */
export function calculateCostPrice(
  inputs: CostPriceInputs,
): CalculationResult<CostPriceResult> {
  const e = requirePositive(inputs.sellingPrice, "sellingPrice", "Selling price");
  if (e) return e;
  const e2 = requireRate(inputs.rate, inputs.basis);
  if (e2) return e2;

  const sellingPrice = round2(inputs.sellingPrice);
  const rateFactor =
    inputs.basis === "markup"
      ? dec(1).plus(dec(inputs.rate).div(100))
      : dec(1).minus(dec(inputs.rate).div(100));
  // markup: CP = SP ÷ (1 + m/100); margin: CP = SP × (1 − g/100)
  const costPrice = round2(
    inputs.basis === "markup"
      ? dec(sellingPrice).div(rateFactor)
      : dec(sellingPrice).times(rateFactor),
  );
  const profit = dec(sellingPrice).minus(costPrice);
  const profitAmount = round2(profit);
  const { markupPercent, marginPercent } = ratePair(
    profit,
    dec(costPrice),
    dec(sellingPrice),
  );

  return {
    ok: true,
    data: {
      sellingPrice,
      rate: inputs.rate,
      basis: inputs.basis,
      costPrice,
      profitAmount,
      markupPercent,
      marginPercent,
    },
  };
}
