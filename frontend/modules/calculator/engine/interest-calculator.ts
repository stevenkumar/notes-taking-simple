/**
 * Loan & Interest Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. Simple interest   — principal + rate + time → interest and maturity
 *   B. Compound interest — same + compounding frequency (annually,
 *                          half-yearly, quarterly, monthly) → maturity,
 *                          interest and effective annual rate
 *   C. Doubling time     — rate + basis (simple or a compounding
 *                          frequency) → years until the amount doubles,
 *                          with the Rule-of-72 shortcut for comparison
 *
 * Rounding policy (same as the EMI/GST/discount engines):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - Everything derives from the DISPLAYED principal: interest and
 *     maturity are computed from round2(P), so the invariant
 *     principal + interest == maturity holds exactly.
 *   - Doubling years round to 2dp; totalMonths is the exact formula
 *     result rounded to whole months for the "7y 3m" display.
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

/** Rate between 0 and 100 inclusive (0% = interest-free). */
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

/** Time in years: greater than 0, at most 100 (fractional years allowed). */
function requireYears(value: number): CalculationError | null {
  if (!Number.isFinite(value)) return fail("Time must be a valid number", "years");
  if (value <= 0) return fail("Time must be greater than 0", "years");
  if (value > 100) return fail("Time cannot exceed 100 years", "years");
  return null;
}

// ── Compounding vocabulary ───────────────────────────────────

/** Compounding periods per year: 1 = annual, 2 = half-yearly, 4 = quarterly, 12 = monthly. */
export type PeriodsPerYear = 1 | 2 | 4 | 12;

/** Doubling-time basis: simple interest or one of the compounding frequencies. */
export type DoublingBasis = PeriodsPerYear | "simple";

function isPeriodsPerYear(value: number): value is PeriodsPerYear {
  return value === 1 || value === 2 || value === 4 || value === 12;
}

function requirePeriods(value: number): CalculationError | null {
  if (!isPeriodsPerYear(value)) {
    return fail(
      "Compounding must be annually, half-yearly, quarterly or monthly",
      "periodsPerYear",
    );
  }
  return null;
}

/** Compounding options for the UI (value → human label). */
export const COMPOUNDING_OPTIONS: Array<{ value: PeriodsPerYear; label: string }> = [
  { value: 1, label: "Annually" },
  { value: 2, label: "Half-yearly" },
  { value: 4, label: "Quarterly" },
  { value: 12, label: "Monthly" },
];

/** Human label for any doubling basis ("simple" | 1 | 2 | 4 | 12). */
export function compoundingLabel(basis: DoublingBasis): string {
  if (basis === "simple") return "Simple interest";
  return COMPOUNDING_OPTIONS.find((o) => o.value === basis)?.label ?? `${basis}× a year`;
}

/** Common savings / FD rate chips for the UI (% p.a.). */
export const INTEREST_RATE_PRESETS = [6, 7, 8, 9, 10] as const;

/** Common time chips for the UI (years). */
export const TIME_YEAR_PRESETS = [1, 2, 3, 5, 10] as const;

// ── Mode A: Simple interest ──────────────────────────────────

export interface SimpleInterestInputs {
  principal: number;
  /** Annual interest rate in percent (0 = interest-free). */
  annualRate: number;
  /** Time in years — fractional values allowed (0.5 = 6 months). */
  years: number;
}

export interface SimpleInterestResult {
  principal: number;
  annualRate: number;
  years: number;
  /** Simple interest, rounded half-up to 2dp. */
  interest: number;
  /** principal + interest (exact invariant). */
  maturity: number;
}

/**
 * SI = P × R × T ÷ 100; maturity = P + SI.
 * Interest is computed from the rounded principal so
 * principal + interest == maturity holds exactly.
 */
export function calculateSimpleInterest(
  inputs: SimpleInterestInputs,
): CalculationResult<SimpleInterestResult> {
  const e = requirePositive(inputs.principal, "principal", "Principal amount");
  if (e) return e;
  const e2 = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e2) return e2;
  const e3 = requireYears(inputs.years);
  if (e3) return e3;

  const principal = round2(inputs.principal);
  const interest = round2(
    dec(principal).times(inputs.annualRate).times(inputs.years).div(100),
  );
  const maturity = round2(dec(principal).plus(interest));

  return {
    ok: true,
    data: {
      principal,
      annualRate: inputs.annualRate,
      years: inputs.years,
      interest,
      maturity,
    },
  };
}

// ── Mode B: Compound interest ────────────────────────────────

export interface CompoundInterestInputs {
  principal: number;
  annualRate: number;
  years: number;
  /** Compounding periods per year. */
  periodsPerYear: PeriodsPerYear;
}

export interface CompoundInterestResult {
  principal: number;
  annualRate: number;
  years: number;
  periodsPerYear: PeriodsPerYear;
  /** Compound interest, rounded half-up to 2dp. */
  interest: number;
  /** maturity = principal + interest (exact invariant). */
  maturity: number;
  /** Effective annual yield in %, e.g. 8% half-yearly → 8.16. */
  effectiveRate: number;
}

/**
 * A = P × (1 + R ÷ (100·n))^(n·T); interest = A − P.
 * The exponent is kept as a Decimal so fractional years never go
 * through a lossy float multiplication (12 × 0.1 stays 1.2).
 */
export function calculateCompoundInterest(
  inputs: CompoundInterestInputs,
): CalculationResult<CompoundInterestResult> {
  const e = requirePositive(inputs.principal, "principal", "Principal amount");
  if (e) return e;
  const e2 = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e2) return e2;
  const e3 = requireYears(inputs.years);
  if (e3) return e3;
  const e4 = requirePeriods(inputs.periodsPerYear);
  if (e4) return e4;

  const principal = round2(inputs.principal);
  const n = inputs.periodsPerYear;
  const ratePerPeriod = dec(inputs.annualRate).div(100 * n);
  const exponent = dec(n).times(inputs.years);

  const factor = dec(1).plus(ratePerPeriod).pow(exponent);
  const maturity = round2(dec(principal).times(factor));
  const interest = round2(dec(maturity).minus(principal));
  const effectiveRate = round2(
    dec(1).plus(ratePerPeriod).pow(n).minus(1).times(100),
  );

  return {
    ok: true,
    data: {
      principal,
      annualRate: inputs.annualRate,
      years: inputs.years,
      periodsPerYear: n,
      interest,
      maturity,
      effectiveRate,
    },
  };
}

// ── Mode C: Doubling time ────────────────────────────────────

export interface DoublingTimeInputs {
  /** Annual rate in percent — must be greater than 0 (0% never doubles). */
  annualRate: number;
  /** Simple interest or a compounding frequency. */
  basis: DoublingBasis;
}

export interface DoublingTimeResult {
  annualRate: number;
  basis: DoublingBasis;
  /** Years until the amount doubles, rounded half-up to 2dp. */
  years: number;
  /** Exact formula result rounded to whole months (for "7y 3m"). */
  totalMonths: number;
  /** Rule-of-72 shortcut: 72 ÷ R, rounded to 2dp. */
  ruleOf72: number;
}

/**
 * Simple:  P(1 + R·T/100) = 2P        →  T = 100 ÷ R
 * Compound: (1 + R/(100·n))^(n·T) = 2  →  T = ln 2 ÷ (n × ln(1 + r))
 */
export function calculateDoublingTime(
  inputs: DoublingTimeInputs,
): CalculationResult<DoublingTimeResult> {
  const e = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e) return e;
  if (inputs.annualRate === 0) {
    return fail("Interest rate must be greater than 0 to double", "annualRate");
  }
  if (inputs.basis !== "simple") {
    const e2 = requirePeriods(inputs.basis);
    if (e2) return e2;
  }

  let exact: Decimal;
  if (inputs.basis === "simple") {
    exact = dec(100).div(inputs.annualRate);
  } else {
    const n = inputs.basis;
    const ratePerPeriod = dec(inputs.annualRate).div(100 * n);
    exact = new Decimal(2)
      .ln()
      .div(dec(n).times(dec(1).plus(ratePerPeriod).ln()));
  }

  const years = round2(exact);
  const totalMonths = exact
    .times(12)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  const ruleOf72 = round2(dec(72).div(inputs.annualRate));

  return {
    ok: true,
    data: {
      annualRate: inputs.annualRate,
      basis: inputs.basis,
      years,
      totalMonths,
      ruleOf72,
    },
  };
}
