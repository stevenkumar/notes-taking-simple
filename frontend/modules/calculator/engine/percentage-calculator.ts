/**
 * Percentage Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes (A–J):
 *   A. Percent of number   — X% of Y
 *   B. What percent        — X is what % of Y
 *   C. Percent change      — from X to Y (signed, with direction)
 *   D. Percent difference  — between X and Y (absolute, over the average)
 *   E. Increase by percent — X increased by Y%
 *   F. Decrease by percent — X decreased by Y%
 *   G. Before increase     — original value before a Y% rise (reverse)
 *   H. Before discount     — original price after a Y% discount (reverse)
 *   I. Percent of what     — X is Y% of what number
 *   J. Combined percent    — net effect of two successive changes
 *
 * Rounding policy (same as the discount/GST engines):
 *   - Inputs round to 2 decimal places, half-up, BEFORE computing, so every
 *     displayed number is exactly the number the formula used.
 *   - value + increase always equals the new result exactly (E/G).
 *   - value − decrease always equals the new result exactly (F/H).
 *
 * Validation: every function returns a discriminated CalculationResult —
 * never throws, never uses eval. Division guards run on the rounded values
 * actually used in the maths, so a tiny input like 0.004 (rounds to 0)
 * returns a field error instead of a Decimal division-by-zero throw.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared config — idempotent with the other engines' call.
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

function requireFinite(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  return null;
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

/** Common percentage chips for the UI (5–50%). */
export const PERCENT_PRESETS = [5, 10, 15, 20, 25, 50] as const;

// ── Mode A: Percent of number ────────────────────────────────

export interface PercentOfInputs {
  percent: number;
  value: number;
}

export interface PercentOfResult {
  percent: number;
  value: number;
  /** value × percent / 100 */
  result: number;
}

export function calculatePercentOf(
  inputs: PercentOfInputs,
): CalculationResult<PercentOfResult> {
  const e = requireFinite(inputs.percent, "percent", "Percent");
  if (e) return e;
  const e2 = requireFinite(inputs.value, "value", "Value");
  if (e2) return e2;

  const percent = round2(dec(inputs.percent));
  const value = round2(dec(inputs.value));
  const result = round2(dec(value).times(percent).div(100));

  return { ok: true, data: { percent, value, result } };
}

// ── Mode B: What percent ─────────────────────────────────────

export interface WhatPercentInputs {
  part: number;
  whole: number;
}

export interface WhatPercentResult {
  part: number;
  whole: number;
  /** part ÷ whole × 100 */
  percent: number;
}

export function findWhatPercent(
  inputs: WhatPercentInputs,
): CalculationResult<WhatPercentResult> {
  const e = requireFinite(inputs.part, "part", "Value");
  if (e) return e;
  const e2 = requireFinite(inputs.whole, "whole", "Whole value");
  if (e2) return e2;

  const part = round2(dec(inputs.part));
  const whole = round2(dec(inputs.whole));
  if (whole === 0) return fail("Whole value cannot be 0", "whole");

  const percent = round2(dec(part).div(whole).times(100));

  return { ok: true, data: { part, whole, percent } };
}

// ── Mode C: Percent change ───────────────────────────────────

export interface PercentChangeInputs {
  from: number;
  to: number;
}

export interface PercentChangeResult {
  from: number;
  to: number;
  /** to − from (signed). */
  difference: number;
  /** (to − from) ÷ from × 100 (signed). */
  percent: number;
  direction: "increase" | "decrease" | "same";
}

export function calculatePercentChange(
  inputs: PercentChangeInputs,
): CalculationResult<PercentChangeResult> {
  const e = requireFinite(inputs.from, "from", "Starting value");
  if (e) return e;
  const e2 = requireFinite(inputs.to, "to", "Final value");
  if (e2) return e2;

  const from = round2(dec(inputs.from));
  const to = round2(dec(inputs.to));
  if (from === 0) return fail("Starting value cannot be 0", "from");

  const difference = round2(dec(to).minus(from));
  const percent = round2(dec(to).minus(from).div(from).times(100));
  const direction =
    percent > 0 ? "increase" : percent < 0 ? "decrease" : "same";

  return { ok: true, data: { from, to, difference, percent, direction } };
}

// ── Mode D: Percent difference ───────────────────────────────

export interface PercentDifferenceInputs {
  valueA: number;
  valueB: number;
}

export interface PercentDifferenceResult {
  valueA: number;
  valueB: number;
  /** |A − B| (unsigned). */
  difference: number;
  /** (A + B) ÷ 2 — the baseline the difference is measured against. */
  average: number;
  /** |A − B| ÷ average × 100 */
  percent: number;
}

export function calculatePercentDifference(
  inputs: PercentDifferenceInputs,
): CalculationResult<PercentDifferenceResult> {
  const e = requireFinite(inputs.valueA, "valueA", "First value");
  if (e) return e;
  const e2 = requireFinite(inputs.valueB, "valueB", "Second value");
  if (e2) return e2;

  const a = round2(dec(inputs.valueA));
  const b = round2(dec(inputs.valueB));
  if (a + b === 0) return fail("The two values cannot add up to 0", "valueB");

  const sum = dec(a).plus(b);
  const difference = round2(dec(a).minus(b).abs());
  const average = round2(sum.div(2));
  const percent = round2(dec(a).minus(b).abs().div(sum.div(2)).times(100));

  return { ok: true, data: { valueA: a, valueB: b, difference, average, percent } };
}

// ── Mode E: Increase by percent ──────────────────────────────

export interface IncreaseInputs {
  value: number;
  percent: number;
}

export interface IncreaseResult {
  value: number;
  percent: number;
  /** value × percent / 100 */
  increase: number;
  /** value + increase */
  result: number;
}

export function calculateIncrease(
  inputs: IncreaseInputs,
): CalculationResult<IncreaseResult> {
  const e = requireFinite(inputs.value, "value", "Value");
  if (e) return e;
  const e2 = requireFinite(inputs.percent, "percent", "Percent");
  if (e2) return e2;

  const value = round2(dec(inputs.value));
  const percent = round2(dec(inputs.percent));
  const increase = round2(dec(value).times(percent).div(100));
  const result = round2(dec(value).plus(increase));

  return { ok: true, data: { value, percent, increase, result } };
}

// ── Mode F: Decrease by percent ──────────────────────────────

export interface DecreaseInputs {
  value: number;
  percent: number;
}

export interface DecreaseResult {
  value: number;
  percent: number;
  /** value × percent / 100 */
  decrease: number;
  /** value − decrease */
  result: number;
}

export function calculateDecrease(
  inputs: DecreaseInputs,
): CalculationResult<DecreaseResult> {
  const e = requireFinite(inputs.value, "value", "Value");
  if (e) return e;
  const e2 = requireFinite(inputs.percent, "percent", "Percent");
  if (e2) return e2;

  const value = round2(dec(inputs.value));
  const percent = round2(dec(inputs.percent));
  const decrease = round2(dec(value).times(percent).div(100));
  const result = round2(dec(value).minus(decrease));

  return { ok: true, data: { value, percent, decrease, result } };
}

// ── Mode G: Original before an increase ──────────────────────

export interface OriginalBeforeIncreaseInputs {
  /** Value after the rise. */
  final: number;
  percent: number;
}

export interface OriginalBeforeIncreaseResult {
  final: number;
  percent: number;
  /** final ÷ (1 + percent / 100) */
  original: number;
  /** final − original */
  increase: number;
}

export function findOriginalBeforeIncrease(
  inputs: OriginalBeforeIncreaseInputs,
): CalculationResult<OriginalBeforeIncreaseResult> {
  const final = round2(dec(inputs.final));
  const e = requirePositive(final, "final", "Final value");
  if (e) return e;
  const percent = round2(dec(inputs.percent));
  const e2 = requireFinite(percent, "percent", "Percent");
  if (e2) return e2;
  if (percent <= -100) {
    return fail("Percent must be greater than −100%", "percent");
  }

  const divisor = dec(1).plus(dec(percent).div(100));
  const original = round2(dec(final).div(divisor));
  const increase = round2(dec(final).minus(original));

  return { ok: true, data: { final, percent, original, increase } };
}

// ── Mode H: Original before a discount ───────────────────────

export interface OriginalBeforeDecreaseInputs {
  /** Price after the discount (sale price). */
  final: number;
  /** Discount percent, 0 ≤ p < 100. */
  percent: number;
}

export interface OriginalBeforeDecreaseResult {
  final: number;
  percent: number;
  /** final ÷ (1 − percent / 100) — the pre-discount price. */
  original: number;
  /** original − final */
  decrease: number;
}

export function findOriginalBeforeDecrease(
  inputs: OriginalBeforeDecreaseInputs,
): CalculationResult<OriginalBeforeDecreaseResult> {
  const final = round2(dec(inputs.final));
  const e = requirePositive(final, "final", "Final value");
  if (e) return e;
  const percent = round2(dec(inputs.percent));
  const e2 = requireFinite(percent, "percent", "Percent");
  if (e2) return e2;
  if (percent < 0) {
    return fail("Discount percent cannot be negative", "percent");
  }
  if (percent >= 100) {
    return fail("Discount percent must be less than 100%", "percent");
  }

  const divisor = dec(1).minus(dec(percent).div(100));
  const original = round2(dec(final).div(divisor));
  // Derived from the rounded original so original − decrease = final exactly.
  const decrease = round2(dec(original).minus(final));

  return { ok: true, data: { final, percent, original, decrease } };
}

// ── Mode I: Percent of what ──────────────────────────────────

export interface PercentOfWhatInputs {
  part: number;
  percent: number;
}

export interface PercentOfWhatResult {
  part: number;
  percent: number;
  /** part ÷ (percent / 100) */
  whole: number;
}

export function findWholeFromPercent(
  inputs: PercentOfWhatInputs,
): CalculationResult<PercentOfWhatResult> {
  const part = round2(dec(inputs.part));
  const e = requireNonNegative(part, "part", "Value");
  if (e) return e;
  const percent = round2(dec(inputs.percent));
  const e2 = requireFinite(percent, "percent", "Percent");
  if (e2) return e2;
  if (percent <= 0) {
    return fail("Percent must be greater than 0", "percent");
  }

  const whole = round2(dec(part).times(100).div(percent));

  return { ok: true, data: { part, percent, whole } };
}

// ── Mode J: Combined (successive) percent change ─────────────

export interface SuccessiveChangeInputs {
  first: number;
  second: number;
}

export interface SuccessiveChangeResult {
  first: number;
  second: number;
  /** (1 + first/100) × (1 + second/100) */
  multiplier: number;
  /** (multiplier − 1) × 100 — a single equivalent change. */
  netPercent: number;
}

export function calculateSuccessiveChange(
  inputs: SuccessiveChangeInputs,
): CalculationResult<SuccessiveChangeResult> {
  const first = round2(dec(inputs.first));
  const e = requireFinite(first, "first", "First change");
  if (e) return e;
  const second = round2(dec(inputs.second));
  const e2 = requireFinite(second, "second", "Second change");
  if (e2) return e2;
  if (first < -100) {
    return fail("First change cannot be less than −100%", "first");
  }
  if (second < -100) {
    return fail("Second change cannot be less than −100%", "second");
  }

  const factor = dec(1)
    .plus(dec(first).div(100))
    .times(dec(1).plus(dec(second).div(100)));
  const multiplier = round2(factor);
  const netPercent = round2(factor.minus(1).times(100));

  return { ok: true, data: { first, second, multiplier, netPercent } };
}
