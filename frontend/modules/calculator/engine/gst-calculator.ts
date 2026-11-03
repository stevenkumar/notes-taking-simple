/**
 * GST Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. Add GST      — price excluding GST + rate → invoice total (exclusive→inclusive)
 *   B. Remove GST   — invoice total (GST included) + rate → price excluding GST
 *   C. Find GST rate — base amount + total → effective GST rate
 *
 * Supply type (Indian GST):
 *   - Intra-state: CGST + SGST, each half of the GST amount
 *   - Inter-state: IGST, equal to the full GST amount
 *
 * Rounding policy (same as the discount engine):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - base + gstAmount always equals the invoice total exactly.
 *   - cgst + sgst always equals gstAmount exactly.
 *
 * Validation: every function returns a discriminated CalculationResult —
 * never throws, never uses eval.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared config — idempotent with the discount engine's call.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Helpers ──────────────────────────────────────────────────

/** Convert a JS number to Decimal safely (via string to avoid float artifacts). */
function dec(value: number | string): Decimal {
  return new Decimal(typeof value === "number" ? String(value) : value);
}

/** Round to 2 decimal places, half-up. Used for all money and percent outputs. */
function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
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

function requireNonNegative(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  return null;
}

/** GST rate between 0 and 100 inclusive. */
function requireRate(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  if (value > 100) return fail(`${label} cannot exceed 100%`, field);
  return null;
}

/**
 * Split a GST amount into CGST + SGST (intra-state).
 * CGST takes the rounded half; SGST gets the remainder so the two
 * always sum exactly to the GST amount (no leaked paise).
 */
function splitCgstSgst(gstAmount: number): { cgst: number; sgst: number } {
  const cgst = round2(dec(gstAmount).div(2));
  const sgst = round2(dec(gstAmount).minus(cgst));
  return { cgst, sgst };
}

/** Standard GST slab chips for the UI. */
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export type SupplyType = "intra" | "inter";

// ── Mode A: Add GST (exclusive → inclusive) ──────────────────

export interface AddGstInputs {
  /** Price excluding GST. */
  baseAmount: number;
  gstRate: number;
  supplyType?: SupplyType;
}

export interface AddGstResult {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  supplyType: SupplyType;
}

export function calculateAddGst(
  inputs: AddGstInputs,
): CalculationResult<AddGstResult> {
  const e = requirePositive(inputs.baseAmount, "baseAmount", "Amount");
  if (e) return e;
  const e2 = requireRate(inputs.gstRate, "gstRate", "GST rate");
  if (e2) return e2;

  const supplyType: SupplyType = inputs.supplyType ?? "intra";
  const base = dec(inputs.baseAmount);
  const gstAmount = round2(base.times(dec(inputs.gstRate)).div(100));
  const totalAmount = round2(base.plus(gstAmount));
  const { cgst, sgst } = splitCgstSgst(gstAmount);

  return {
    ok: true,
    data: {
      baseAmount: round2(base),
      gstRate: inputs.gstRate,
      gstAmount,
      cgst: supplyType === "intra" ? cgst : 0,
      sgst: supplyType === "intra" ? sgst : 0,
      igst: supplyType === "inter" ? gstAmount : 0,
      totalAmount,
      supplyType,
    },
  };
}

// ── Mode B: Remove GST (inclusive → exclusive) ───────────────

export interface RemoveGstInputs {
  /** Invoice total including GST. */
  totalAmount: number;
  gstRate: number;
  supplyType?: SupplyType;
}

export interface RemoveGstResult {
  totalAmount: number;
  gstRate: number;
  gstAmount: number;
  baseAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  supplyType: SupplyType;
}

/**
 * Back-calculate the pre-GST price: base = total / (1 + rate/100).
 * The GST amount is derived as total − base so the split sums exactly.
 */
export function calculateRemoveGst(
  inputs: RemoveGstInputs,
): CalculationResult<RemoveGstResult> {
  const e = requirePositive(inputs.totalAmount, "totalAmount", "Total amount");
  if (e) return e;
  const e2 = requireRate(inputs.gstRate, "gstRate", "GST rate");
  if (e2) return e2;

  const supplyType: SupplyType = inputs.supplyType ?? "intra";
  const total = dec(inputs.totalAmount);
  const divisor = dec(1).plus(dec(inputs.gstRate).div(100));
  const baseAmount = round2(total.div(divisor));
  const gstAmount = round2(total.minus(baseAmount));
  const { cgst, sgst } = splitCgstSgst(gstAmount);

  return {
    ok: true,
    data: {
      totalAmount: round2(total),
      gstRate: inputs.gstRate,
      gstAmount,
      baseAmount,
      cgst: supplyType === "intra" ? cgst : 0,
      sgst: supplyType === "intra" ? sgst : 0,
      igst: supplyType === "inter" ? gstAmount : 0,
      supplyType,
    },
  };
}

// ── Mode C: Find GST rate ────────────────────────────────────

export interface FindRateInputs {
  /** Price excluding GST. */
  baseAmount: number;
  /** Invoice total including GST. */
  totalAmount: number;
}

export interface FindRateResult {
  baseAmount: number;
  totalAmount: number;
  gstAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
}

export function findGstRate(
  inputs: FindRateInputs,
): CalculationResult<FindRateResult> {
  const e = requirePositive(inputs.baseAmount, "baseAmount", "Amount without GST");
  if (e) return e;
  const e2 = requirePositive(inputs.totalAmount, "totalAmount", "Total with GST");
  if (e2) return e2;

  const base = dec(inputs.baseAmount);
  const total = dec(inputs.totalAmount);

  if (total.lt(base)) {
    return fail(
      "Total with GST cannot be less than the amount without GST",
      "totalAmount",
    );
  }

  const gstAmount = round2(total.minus(base));
  const gstRate = round2(total.minus(base).div(base).times(100));
  const { cgst, sgst } = splitCgstSgst(gstAmount);

  return {
    ok: true,
    data: {
      baseAmount: round2(base),
      totalAmount: round2(total),
      gstAmount,
      gstRate,
      cgst,
      sgst,
    },
  };
}

// ── Convenience: split any amount by rate (used by tests/UI) ─

export function gstSplit(
  amount: number,
  rate: number,
): { gst: number; cgst: number; sgst: number } | null {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return null;
  if (amount < 0 || rate < 0 || rate > 100) return null;
  const gst = round2(dec(amount).times(dec(rate)).div(100));
  const { cgst, sgst } = splitCgstSgst(gst);
  return { gst, cgst, sgst };
}
