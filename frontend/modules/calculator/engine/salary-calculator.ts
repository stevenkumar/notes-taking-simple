/**
 * Salary Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. CTC → Take-home       — annual CTC (which includes employer PF),
 *                              basic % of CTC, PF % of basic (same rate
 *                              for employee and employer), professional
 *                              tax and other monthly deductions →
 *                              gross, deductions and in-hand pay
 *   B. Monthly gross → Take-home — monthly gross before employee-side
 *                              deductions with the same PF/tax/other
 *                              inputs → monthly and annual take-home
 *
 * Model (Mode A, standard Indian CTC structure):
 *   annual basic      = CTC × basic%
 *   employer PF       = annual basic × pf%   (part of CTC, not gross)
 *   gross             = CTC − employer PF
 *   employee PF       = annual basic × pf%   (deducted from gross)
 *   deductions        = employee PF + professional tax × 12 + other × 12
 *   in-hand           = gross − deductions
 *
 * Rounding policy (same as the EMI/interest/discount engines):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - Mode A derives annual values first; monthly figures are the annual
 *     value ÷ 12 rounded half-up.
 *   - Mode B derives monthly values first; annual figures are monthly × 12
 *     rounded half-up, so monthlyInHand × 12 == annualInHand exactly.
 *   - Deduction % rounds to 2dp.
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

/** Percent between 0 and 100 inclusive (0 = no basic/PF component). */
function requirePercent(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  if (value > 100) return fail(`${label} must be between 0 and 100`, field);
  return null;
}

/** Money input that may be zero but never negative. */
function requireNonNegative(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  return null;
}

// ── Shared defaults & presets (used by the UI) ───────────────

/** Sensible Indian-salary defaults so only the salary amount is required. */
export const SALARY_DEFAULTS = {
  basicPercent: 40,
  pfPercent: 12,
  professionalTaxMonthly: 200,
  otherDeductionsMonthly: 0,
} as const;

/** Common basic-salary share chips (% of CTC/gross). */
export const SALARY_BASIC_PERCENT_PRESETS = [40, 50, 60] as const;

/** Annual CTC chips for quick fills (₹). */
export const SALARY_CTC_PRESETS = [600000, 1200000, 2400000] as const;

/** Monthly gross chips for quick fills (₹). */
export const SALARY_GROSS_PRESETS = [25000, 50000, 100000] as const;

// ── Mode A: CTC → Take-home ──────────────────────────────────

export interface SalaryFromCtcInputs {
  /** Annual cost to company in ₹ — must be greater than 0. */
  annualCtc: number;
  /** Basic salary as % of CTC (0–100). */
  basicPercent: number;
  /** PF % of basic, applied to BOTH employee and employer (0–100). */
  pfPercent: number;
  /** Professional tax per month in ₹ (₹200 in most states). */
  professionalTaxMonthly: number;
  /** Any other monthly deductions in ₹ (voluntary PF, insurance, …). */
  otherDeductionsMonthly: number;
}

export interface SalaryFromCtcResult {
  annualCtc: number;
  basicPercent: number;
  pfPercent: number;
  professionalTaxMonthly: number;
  otherDeductionsMonthly: number;
  /** CTC × basic%, rounded half-up to 2dp. */
  annualBasic: number;
  /** employer PF = annual basic × pf% — part of CTC, reduces gross. */
  employerPfAnnual: number;
  /** CTC − employer PF. */
  grossAnnual: number;
  /** employee PF = annual basic × pf% (same rate, deducted from gross). */
  employeePfAnnual: number;
  /** professionalTaxMonthly × 12. */
  ptAnnual: number;
  /** otherDeductionsMonthly × 12. */
  otherAnnual: number;
  /** employee PF + professional tax + other deductions (annual). */
  totalDeductionsAnnual: number;
  /** gross − total deductions; guarded to never go below 0. */
  inHandAnnual: number;
  /** grossAnnual ÷ 12, rounded half-up. */
  monthlyGross: number;
  /** inHandAnnual ÷ 12, rounded half-up. */
  monthlyInHand: number;
  /** (CTC − in-hand) ÷ CTC × 100 — how much of the CTC is kept. */
  deductionPercent: number;
}

/**
 * CTC → take-home. Employer PF comes out of the CTC first, then employee
 * PF, professional tax and other deductions come out of the gross.
 * Returns an error when deductions would push take-home below zero.
 */
export function calculateSalaryFromCtc(
  inputs: SalaryFromCtcInputs,
): CalculationResult<SalaryFromCtcResult> {
  const e = requirePositive(inputs.annualCtc, "annualCtc", "Annual CTC");
  if (e) return e;
  const e2 = requirePercent(inputs.basicPercent, "basicPercent", "Basic %");
  if (e2) return e2;
  const e3 = requirePercent(inputs.pfPercent, "pfPercent", "PF %");
  if (e3) return e3;
  const e4 = requireNonNegative(
    inputs.professionalTaxMonthly,
    "professionalTaxMonthly",
    "Professional tax",
  );
  if (e4) return e4;
  const e5 = requireNonNegative(
    inputs.otherDeductionsMonthly,
    "otherDeductionsMonthly",
    "Other deductions",
  );
  if (e5) return e5;

  const ctc = round2(inputs.annualCtc);
  const annualBasic = round2(dec(ctc).times(inputs.basicPercent).div(100));
  const employerPfAnnual = round2(dec(annualBasic).times(inputs.pfPercent).div(100));
  const grossAnnual = round2(dec(ctc).minus(employerPfAnnual));
  const employeePfAnnual = employerPfAnnual; // identical rate on the same basic
  const ptAnnual = round2(dec(inputs.professionalTaxMonthly).times(12));
  const otherAnnual = round2(dec(inputs.otherDeductionsMonthly).times(12));
  const totalDeductionsAnnual = round2(
    dec(employeePfAnnual).plus(ptAnnual).plus(otherAnnual),
  );
  const inHandAnnual = round2(dec(grossAnnual).minus(totalDeductionsAnnual));
  if (inHandAnnual < 0) {
    return fail("Deductions exceed your gross salary");
  }

  const monthlyGross = round2(dec(grossAnnual).div(12));
  const monthlyInHand = round2(dec(inHandAnnual).div(12));
  const deductionPercent = round2(
    dec(ctc).minus(inHandAnnual).div(ctc).times(100),
  );

  return {
    ok: true,
    data: {
      annualCtc: ctc,
      basicPercent: inputs.basicPercent,
      pfPercent: inputs.pfPercent,
      professionalTaxMonthly: inputs.professionalTaxMonthly,
      otherDeductionsMonthly: inputs.otherDeductionsMonthly,
      annualBasic,
      employerPfAnnual,
      grossAnnual,
      employeePfAnnual,
      ptAnnual,
      otherAnnual,
      totalDeductionsAnnual,
      inHandAnnual,
      monthlyGross,
      monthlyInHand,
      deductionPercent,
    },
  };
}

// ── Mode B: Monthly gross → Take-home ────────────────────────

export interface SalaryFromGrossInputs {
  /** Monthly gross salary in ₹ (before employee-side deductions). */
  monthlyGross: number;
  /** Basic salary as % of gross (0–100). */
  basicPercent: number;
  /** PF % of basic (employee side only in this mode) (0–100). */
  pfPercent: number;
  /** Professional tax per month in ₹. */
  professionalTaxMonthly: number;
  /** Any other monthly deductions in ₹. */
  otherDeductionsMonthly: number;
}

export interface SalaryFromGrossResult {
  monthlyGross: number;
  basicPercent: number;
  pfPercent: number;
  professionalTaxMonthly: number;
  otherDeductionsMonthly: number;
  /** monthlyGross × basic%, rounded half-up to 2dp. */
  monthlyBasic: number;
  /** monthlyBasic × pf%. */
  employeePfMonthly: number;
  /** employee PF + professional tax + other deductions (monthly). */
  totalDeductionsMonthly: number;
  /** monthlyGross − total deductions; guarded to never go below 0. */
  monthlyInHand: number;
  /** monthlyGross × 12. */
  annualGross: number;
  /** totalDeductionsMonthly × 12. */
  annualDeductions: number;
  /** monthlyInHand × 12 — exact invariant with the monthly figure. */
  annualInHand: number;
  /** totalDeductions ÷ monthlyGross × 100. */
  deductionPercent: number;
}

/**
 * Monthly gross → take-home. PF applies to the basic component only;
 * annual figures derive from the rounded monthly values so
 * monthlyInHand × 12 == annualInHand holds exactly.
 */
export function calculateSalaryFromGross(
  inputs: SalaryFromGrossInputs,
): CalculationResult<SalaryFromGrossResult> {
  const e = requirePositive(inputs.monthlyGross, "monthlyGross", "Monthly gross salary");
  if (e) return e;
  const e2 = requirePercent(inputs.basicPercent, "basicPercent", "Basic %");
  if (e2) return e2;
  const e3 = requirePercent(inputs.pfPercent, "pfPercent", "PF %");
  if (e3) return e3;
  const e4 = requireNonNegative(
    inputs.professionalTaxMonthly,
    "professionalTaxMonthly",
    "Professional tax",
  );
  if (e4) return e4;
  const e5 = requireNonNegative(
    inputs.otherDeductionsMonthly,
    "otherDeductionsMonthly",
    "Other deductions",
  );
  if (e5) return e5;

  const gross = round2(inputs.monthlyGross);
  const monthlyBasic = round2(dec(gross).times(inputs.basicPercent).div(100));
  const employeePfMonthly = round2(dec(monthlyBasic).times(inputs.pfPercent).div(100));
  const totalDeductionsMonthly = round2(
    dec(employeePfMonthly)
      .plus(inputs.professionalTaxMonthly)
      .plus(inputs.otherDeductionsMonthly),
  );
  const monthlyInHand = round2(dec(gross).minus(totalDeductionsMonthly));
  if (monthlyInHand < 0) {
    return fail("Deductions exceed your gross salary");
  }

  const annualGross = round2(dec(gross).times(12));
  const annualDeductions = round2(dec(totalDeductionsMonthly).times(12));
  const annualInHand = round2(dec(monthlyInHand).times(12));
  const deductionPercent = round2(dec(totalDeductionsMonthly).div(gross).times(100));

  return {
    ok: true,
    data: {
      monthlyGross: gross,
      basicPercent: inputs.basicPercent,
      pfPercent: inputs.pfPercent,
      professionalTaxMonthly: inputs.professionalTaxMonthly,
      otherDeductionsMonthly: inputs.otherDeductionsMonthly,
      monthlyBasic,
      employeePfMonthly,
      totalDeductionsMonthly,
      monthlyInHand,
      annualGross,
      annualDeductions,
      annualInHand,
      deductionPercent,
    },
  };
}
