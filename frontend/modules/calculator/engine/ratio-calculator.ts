/**
 * Ratio & Proportion Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. Simplify ratio   — two positive whole numbers → reduced terms,
 *                         GCD (Euclidean algorithm) and the percentage
 *                         split of the two parts
 *   B. Solve proportion — a : b = c : x → the missing term x where
 *                         x = b × c ÷ a
 *   C. Divide in ratio  — an amount shared a : b → each share, with
 *                         the exact-sum invariant shareA + shareB =
 *                         amount (second share is the complement of
 *                         the rounded first)
 *
 * Vocabulary:
 *   GCD = greatest common divisor of the two ratio terms
 *   percentFirst = first term ÷ (first + second) × 100
 *
 * Rounding policy (same as the other engines):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - The solved proportion term rounds to 2dp half-up.
 *   - Percent outputs round to 2dp; the second share/percent is the
 *     complement of the rounded first so each pair sums exactly.
 *   - Ratio terms are validated as positive safe integers — ratios are
 *     conventionally whole numbers, so fractional terms are rejected.
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

/** Round to 2 decimal places, half-up. Used for all money and percent outputs. */
function round2(value: Decimal | number): number {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

/** Positive safe integer — the only shape a ratio term may take. */
function requireWholePositive(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (!Number.isSafeInteger(value)) return fail(`${label} must be a whole number`, field);
  if (value <= 0) return fail(`${label} must be greater than 0`, field);
  return null;
}

/** Positive money input (fractional amounts allowed). */
function requirePositiveAmount(value: number): CalculationError | null {
  if (!Number.isFinite(value)) return fail("Amount must be a valid number", "amount");
  if (value <= 0) return fail("Amount must be greater than 0", "amount");
  return null;
}

/** Euclidean algorithm on safe integers (both terms are validated positive). */
function gcd(x: number, y: number): number {
  let a = Math.abs(x);
  let b = Math.abs(y);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

// ── Shared presets (used by the UI) ──────────────────────────

/** Example pairs that visibly simplify (4:6 → 2:3). */
export const RATIO_EXAMPLE_PRESETS = [
  { firstTerm: 4, secondTerm: 6 },
  { firstTerm: 12, secondTerm: 18 },
  { firstTerm: 45, secondTerm: 60 },
] as const;

/** Example proportions with whole-number answers (2:3 = 4:6). */
export const PROPORTION_EXAMPLE_PRESETS = [
  { firstTerm: 2, secondTerm: 3, thirdTerm: 4 },
  { firstTerm: 1, secondTerm: 2, thirdTerm: 5 },
  { firstTerm: 3, secondTerm: 4, thirdTerm: 6 },
] as const;

/** Common split ratios for dividing an amount. */
export const RATIO_SPLIT_PRESETS = [
  { firstTerm: 1, secondTerm: 1 },
  { firstTerm: 2, secondTerm: 1 },
  { firstTerm: 3, secondTerm: 2 },
] as const;

/** Amount chips for quick fills (₹). */
export const RATIO_AMOUNT_PRESETS = [1000, 5000, 10000] as const;

// ── Mode A: Simplify ratio ───────────────────────────────────

export interface SimplifyRatioInputs {
  /** First ratio term — positive safe integer. */
  firstTerm: number;
  /** Second ratio term — positive safe integer. */
  secondTerm: number;
}

export interface SimplifyRatioResult {
  /** Original terms as entered. */
  originalFirst: number;
  originalSecond: number;
  /** first ÷ GCD — the reduced first term. */
  firstTerm: number;
  /** second ÷ GCD — the reduced second term. */
  secondTerm: number;
  /** Greatest common divisor of the original terms. */
  gcd: number;
  /** first ÷ (first + second) × 100 from the REDUCED terms, 2dp. */
  percentFirst: number;
  /** 100 − percentFirst, so the pair sums to exactly 100. */
  percentSecond: number;
}

/**
 * Reduce a ratio to lowest terms and report its GCD and percentage
 * split. Both terms must be positive whole numbers.
 */
export function simplifyRatio(
  inputs: SimplifyRatioInputs,
): CalculationResult<SimplifyRatioResult> {
  const e = requireWholePositive(inputs.firstTerm, "firstTerm", "First term");
  if (e) return e;
  const e2 = requireWholePositive(inputs.secondTerm, "secondTerm", "Second term");
  if (e2) return e2;

  const originalFirst = inputs.firstTerm;
  const originalSecond = inputs.secondTerm;
  const divisor = gcd(originalFirst, originalSecond);
  const firstTerm = originalFirst / divisor;
  const secondTerm = originalSecond / divisor;
  const percentFirst = round2(
    dec(firstTerm).div(firstTerm + secondTerm).times(100),
  );
  const percentSecond = round2(dec(100).minus(percentFirst));

  return {
    ok: true,
    data: {
      originalFirst,
      originalSecond,
      firstTerm,
      secondTerm,
      gcd: divisor,
      percentFirst,
      percentSecond,
    },
  };
}

// ── Mode B: Solve proportion ─────────────────────────────────

export interface SolveProportionInputs {
  /** Left-hand ratio, first term (a in a : b = c : x) — positive integer. */
  firstTerm: number;
  /** Left-hand ratio, second term (b) — positive integer. */
  secondTerm: number;
  /** Right-hand ratio, known term (c) — positive integer. */
  thirdTerm: number;
}

export interface SolveProportionResult {
  firstTerm: number;
  secondTerm: number;
  thirdTerm: number;
  /** b × c ÷ a, rounded half-up to 2dp. */
  solvedTerm: number;
}

/**
 * Solve a : b = c : x for x. The first term may not be zero (it is
 * the divisor); all terms must be positive whole numbers.
 */
export function solveProportion(
  inputs: SolveProportionInputs,
): CalculationResult<SolveProportionResult> {
  const e = requireWholePositive(inputs.firstTerm, "firstTerm", "First term");
  if (e) return e;
  const e2 = requireWholePositive(inputs.secondTerm, "secondTerm", "Second term");
  if (e2) return e2;
  const e3 = requireWholePositive(inputs.thirdTerm, "thirdTerm", "Third term");
  if (e3) return e3;

  const solvedTerm = round2(
    dec(inputs.secondTerm).times(inputs.thirdTerm).div(inputs.firstTerm),
  );

  return {
    ok: true,
    data: {
      firstTerm: inputs.firstTerm,
      secondTerm: inputs.secondTerm,
      thirdTerm: inputs.thirdTerm,
      solvedTerm,
    },
  };
}

// ── Mode C: Divide amount in ratio ───────────────────────────

export interface DivideInRatioInputs {
  /** Total amount to share in ₹ — must be greater than 0. */
  amount: number;
  /** First ratio part — positive safe integer. */
  firstTerm: number;
  /** Second ratio part — positive safe integer. */
  secondTerm: number;
}

export interface DivideInRatioResult {
  /** Amount rounded half-up to 2dp before splitting. */
  amount: number;
  firstTerm: number;
  secondTerm: number;
  /** firstTerm + secondTerm. */
  totalParts: number;
  /** amount × first ÷ parts, rounded half-up to 2dp. */
  firstShare: number;
  /** amount − firstShare — the rounded complement so shares sum exactly. */
  secondShare: number;
  /** first ÷ parts × 100, 2dp. */
  percentFirst: number;
  /** 100 − percentFirst. */
  percentSecond: number;
}

/**
 * Split an amount a : b. The first share is rounded half-up and the
 * second share is the complement, so firstShare + secondShare equals
 * the (rounded) amount exactly.
 */
export function divideInRatio(
  inputs: DivideInRatioInputs,
): CalculationResult<DivideInRatioResult> {
  const e = requirePositiveAmount(inputs.amount);
  if (e) return e;
  const e2 = requireWholePositive(inputs.firstTerm, "firstTerm", "First term");
  if (e2) return e2;
  const e3 = requireWholePositive(inputs.secondTerm, "secondTerm", "Second term");
  if (e3) return e3;

  const amount = round2(inputs.amount);
  const totalParts = inputs.firstTerm + inputs.secondTerm;
  const firstShare = round2(
    dec(amount).times(inputs.firstTerm).div(totalParts),
  );
  const secondShare = round2(dec(amount).minus(firstShare));
  const percentFirst = round2(
    dec(inputs.firstTerm).div(totalParts).times(100),
  );
  const percentSecond = round2(dec(100).minus(percentFirst));

  return {
    ok: true,
    data: {
      amount,
      firstTerm: inputs.firstTerm,
      secondTerm: inputs.secondTerm,
      totalParts,
      firstShare,
      secondShare,
      percentFirst,
      percentSecond,
    },
  };
}
