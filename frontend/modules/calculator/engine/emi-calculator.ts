/**
 * EMI & Loan Calculator – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Modes:
 *   A. Find EMI       — principal + rate + tenure → monthly instalment
 *   B. Loan amount    — affordable EMI + rate + tenure → maximum principal
 *   C. Prepayment     — loan + extra monthly payment → tenure and interest saved
 *
 * Rounding policy (same as the discount/GST engines):
 *   - Money rounds to 2 decimal places, half-up, at each produced value.
 *   - The amortisation schedule is built from the ROUNDED EMI: each month
 *     interest = round2(balance × r), principal = EMI − interest, and the
 *     final payment clears whatever balance remains.
 *   - Invariants: Σ principal payments == original principal,
 *     final balance == 0, totalPayment == principal + totalInterest.
 *
 * Validation: every function returns a discriminated CalculationResult —
 * never throws, never uses eval.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared config — idempotent with the discount/GST engines' call.
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

/** GST-style rate between 0 and 100 inclusive (0% = interest-free loan). */
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

/** Tenure as a whole number of months, 1 – 600 (50 years). */
function requireTenure(value: number): CalculationError | null {
  if (!Number.isFinite(value)) return fail("Tenure must be a valid number", "tenure");
  if (!Number.isInteger(value)) {
    return fail("Tenure must be a whole number of months", "tenure");
  }
  if (value < 1) return fail("Tenure must be at least 1 month", "tenure");
  if (value > 600) return fail("Tenure cannot exceed 600 months (50 years)", "tenure");
  return null;
}

// ── Schedule primitives ──────────────────────────────────────

export interface MonthlyScheduleRow {
  /** 1-based month index. */
  month: number;
  payment: number;
  interest: number;
  principal: number;
  /** Balance after this payment. */
  balance: number;
}

export interface YearlySummaryRow {
  /** 1-based loan year. */
  year: number;
  principalPaid: number;
  interestPaid: number;
  /** Balance at the end of this year. */
  closingBalance: number;
}

/**
 * Maximum number of instalments the schedule builder will simulate.
 * Normal loans settle within tenureMonths (+2 for rounding); the cap
 * guarantees termination even for pathological inputs.
 */
const MAX_SCHEDULE_MONTHS = 10_000;

/**
 * Build a monthly amortisation schedule for a fixed payment.
 * Returns null when the payment never covers the interest (balance
 * would grow forever) — callers surface that as a validation error.
 *
 * The final instalment clears whatever balance remains so the
 * schedule always ends at exactly 0 (no leaked paise).
 */
export function buildSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  payment: number,
): MonthlyScheduleRow[] | null {
  const monthlyRate = dec(annualRate).div(1200);
  let balance = dec(principal);
  const rows: MonthlyScheduleRow[] = [];

  for (let month = 1; month <= Math.max(tenureMonths, 1) + 2; month++) {
    if (balance.lte(0)) break;
    if (rows.length >= MAX_SCHEDULE_MONTHS) return null;

    const interest = round2(balance.times(monthlyRate));
    const principalComponent = round2(dec(payment).minus(interest));

    // Payment does not cover interest — loan never repays.
    if (principalComponent <= 0) return null;

    // The final instalment always clears whatever balance remains so
    // the schedule ends at exactly 0 (the EMI rounding difference is
    // absorbed by the last payment, as lenders do).
    const isFinalMonth = month >= tenureMonths;
    let principalPaid: number;
    let paid: number;
    if (isFinalMonth || principalComponent >= balance.toNumber()) {
      principalPaid = round2(balance);
      paid = round2(balance.plus(interest));
      balance = new Decimal(0);
    } else {
      principalPaid = principalComponent;
      paid = round2(dec(payment));
      balance = dec(round2(balance.minus(principalPaid)));
    }

    rows.push({ month, payment: paid, interest, principal: principalPaid, balance: round2(balance) });
  }

  // Could not settle within the safety window.
  if (balance.gt(0)) return null;
  return rows;
}

/** Aggregate a monthly schedule into one row per loan year. */
export function summariseByYear(schedule: MonthlyScheduleRow[]): YearlySummaryRow[] {
  const years: YearlySummaryRow[] = [];
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    let summary = years[year - 1];
    if (!summary) {
      summary = { year, principalPaid: 0, interestPaid: 0, closingBalance: 0 };
      years[year - 1] = summary;
    }
    summary.principalPaid = round2(dec(summary.principalPaid).plus(row.principal));
    summary.interestPaid = round2(dec(summary.interestPaid).plus(row.interest));
    summary.closingBalance = row.balance;
  }
  return years;
}

/** Common loan interest rate chips for the UI (home / car / personal). */
export const EMI_RATE_PRESETS = [6.5, 8.5, 10, 12, 15] as const;

/** Common tenure chips (years) for the UI. */
export const EMI_TENURE_YEAR_PRESETS = [5, 10, 15, 20, 30] as const;

// ── Mode A: Find EMI ─────────────────────────────────────────

export interface EmiInputs {
  /** Loan principal. */
  principal: number;
  /** Annual interest rate in percent (0 = interest-free). */
  annualRate: number;
  tenureMonths: number;
}

export interface EmiResult {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  /** Monthly instalment (rounded half-up to 2dp). */
  emi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: MonthlyScheduleRow[];
}

export function calculateEmi(
  inputs: EmiInputs,
): CalculationResult<EmiResult> {
  const e = requirePositive(inputs.principal, "principal", "Loan amount");
  if (e) return e;
  const e2 = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e2) return e2;
  const e3 = requireTenure(inputs.tenureMonths);
  if (e3) return e3;

  const principal = dec(inputs.principal);
  const n = inputs.tenureMonths;
  const r = dec(inputs.annualRate).div(1200);

  // EMI = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1); at 0% it is simply P/n.
  let emi: number;
  if (r.isZero()) {
    emi = round2(principal.div(n));
  } else {
    const factor = dec(1).plus(r).pow(n);
    emi = round2(principal.times(r).times(factor).div(factor.minus(1)));
  }
  // Tiny loans can round the EMI to 0 — floor at the smallest currency
  // unit so a positive principal always has a repayable instalment.
  if (emi < 0.01) emi = 0.01;

  const schedule = buildSchedule(inputs.principal, inputs.annualRate, n, emi);
  if (!schedule) {
    return fail("Could not build a repayment schedule for these terms", "principal");
  }

  const totalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0),
  );
  const totalPayment = round2(principal.plus(totalInterest).toNumber());

  return {
    ok: true,
    data: {
      principal: round2(principal),
      annualRate: inputs.annualRate,
      tenureMonths: n,
      emi,
      totalInterest,
      totalPayment,
      schedule,
    },
  };
}

// ── Mode B: Loan amount (affordability) ──────────────────────

export interface AffordabilityInputs {
  /** Maximum monthly instalment the borrower can afford. */
  monthlyPayment: number;
  annualRate: number;
  tenureMonths: number;
}

export interface AffordabilityResult {
  principal: number;
  monthlyPayment: number;
  annualRate: number;
  tenureMonths: number;
  totalInterest: number;
  totalPayment: number;
  schedule: MonthlyScheduleRow[];
}

/**
 * Reverse EMI: P = EMI·((1+r)ⁿ − 1) / (r·(1+r)ⁿ);
 * at 0% it is simply EMI·n.
 */
export function calculateAffordableLoan(
  inputs: AffordabilityInputs,
): CalculationResult<AffordabilityResult> {
  const e = requirePositive(inputs.monthlyPayment, "monthlyPayment", "Monthly EMI");
  if (e) return e;
  const e2 = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e2) return e2;
  const e3 = requireTenure(inputs.tenureMonths);
  if (e3) return e3;

  const emi = dec(inputs.monthlyPayment);
  const n = inputs.tenureMonths;
  const r = dec(inputs.annualRate).div(1200);

  let principal: number;
  if (r.isZero()) {
    principal = round2(emi.times(n));
  } else {
    const factor = dec(1).plus(r).pow(n);
    principal = round2(emi.times(factor.minus(1)).div(r.times(factor)));
  }

  if (principal <= 0) {
    return fail("Monthly EMI is too small for these terms", "monthlyPayment");
  }

  const schedule = buildSchedule(principal, inputs.annualRate, n, inputs.monthlyPayment);
  if (!schedule) {
    return fail(
      "Monthly EMI does not cover the interest for these terms",
      "monthlyPayment",
    );
  }

  const totalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0),
  );
  const totalPayment = round2(principal + totalInterest);

  return {
    ok: true,
    data: {
      principal,
      monthlyPayment: round2(emi),
      annualRate: inputs.annualRate,
      tenureMonths: n,
      totalInterest,
      totalPayment,
      schedule,
    },
  };
}

// ── Mode C: Prepayment impact ────────────────────────────────

export interface PrepaymentInputs {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  /** Extra amount paid every month on top of the EMI. */
  extraPayment: number;
}

export interface PrepaymentResult {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  /** Original monthly instalment. */
  emi: number;
  extraPayment: number;
  /** EMI + extra payment. */
  newPayment: number;
  /** Months actually needed with the extra payment. */
  newTenureMonths: number;
  /** Original tenure − new tenure (months saved). */
  monthsSaved: number;
  totalInterest: number;
  newTotalInterest: number;
  /** Original interest − new interest. */
  interestSaved: number;
  /** Schedule with the extra payment (for the UI table). */
  schedule: MonthlyScheduleRow[];
}

export function calculatePrepaymentImpact(
  inputs: PrepaymentInputs,
): CalculationResult<PrepaymentResult> {
  const e = requirePositive(inputs.principal, "principal", "Loan amount");
  if (e) return e;
  const e2 = requireRate(inputs.annualRate, "annualRate", "Interest rate");
  if (e2) return e2;
  const e3 = requireTenure(inputs.tenureMonths);
  if (e3) return e3;
  const e4 = requirePositive(inputs.extraPayment, "extraPayment", "Extra payment");
  if (e4) return e4;

  // Original loan (reuses Mode A validation + maths).
  const original = calculateEmi({
    principal: inputs.principal,
    annualRate: inputs.annualRate,
    tenureMonths: inputs.tenureMonths,
  });
  if (!original.ok) return original;

  const newPayment = round2(original.data.emi + inputs.extraPayment);
  const schedule = buildSchedule(
    inputs.principal,
    inputs.annualRate,
    inputs.tenureMonths,
    newPayment,
  );
  if (!schedule) {
    return fail("Could not simulate the loan with this extra payment", "extraPayment");
  }

  const newTotalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0),
  );
  const monthsSaved = original.data.schedule.length - schedule.length;

  return {
    ok: true,
    data: {
      principal: original.data.principal,
      annualRate: inputs.annualRate,
      tenureMonths: inputs.tenureMonths,
      emi: original.data.emi,
      extraPayment: round2(inputs.extraPayment),
      newPayment,
      newTenureMonths: schedule.length,
      monthsSaved,
      totalInterest: original.data.totalInterest,
      newTotalInterest,
      interestSaved: round2(original.data.totalInterest - newTotalInterest),
      schedule,
    },
  };
}
