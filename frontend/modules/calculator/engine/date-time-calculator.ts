/**
 * Date & Time Calculator – calculation engine.
 *
 * Four pure modes over calendar dates (PRD §14): no `eval`, no mutation,
 * no hidden "now" — the caller supplies every date, so tests pin exact
 * answers forever. Day arithmetic reuses the age engine's tested serial
 * primitives (toSerial / fromSerial / weekdayIndex).
 *
 * Semantics (documented and tested):
 *   A. Date difference  — Y/M/D between two dates, order-independent
 *                         (reversed flag when inputs arrive backwards).
 *   B. Add/subtract days — shift a date by a whole number of days
 *                         (signed), with a weeks+days breakdown.
 *   C. Working days     — Mon–Fri count INCLUSIVE of both endpoints
 *                         (weekend days = total − working, no holidays).
 *   D. Countdown        — signed days from today to a target date
 *                         (+ future, − past, 0 today) with a Y/M/D
 *                         duration and the target's weekday.
 *
 * Validation: every function returns a discriminated CalculationResult.
 */

import type { CalculationError, CalculationResult } from "../types";
import {
  compareDates,
  daysBetween,
  diffYMD,
  fromSerial,
  isValidDate,
  toSerial,
  weekdayIndex,
  weekdayName,
  type DateParts,
  type YMD,
} from "./age-calculator";

// ── Types ────────────────────────────────────────────────────

export interface DateDifferenceInputs {
  from: DateParts;
  to: DateParts;
}

export interface DateDifferenceResult extends YMD {
  from: DateParts;
  to: DateParts;
  /** Normalised order — earlier date first. */
  earlier: DateParts;
  later: DateParts;
  /** True when the inputs arrived in reverse (from > to). */
  reversed: boolean;
  totalDays: number;
  fromWeekday: string;
  toWeekday: string;
}

export interface AddDaysInputs {
  date: DateParts;
  /** Signed: positive adds days, negative subtracts. */
  amount: number;
}

export interface AddDaysResult {
  start: DateParts;
  result: DateParts;
  amount: number;
  /** |amount| split for display: weeks + leftover days. */
  weeks: number;
  remainderDays: number;
  resultWeekday: string;
}

export interface WorkingDaysInputs {
  from: DateParts;
  to: DateParts;
}

export interface WorkingDaysResult {
  from: DateParts;
  to: DateParts;
  earlier: DateParts;
  later: DateParts;
  reversed: boolean;
  /** Inclusive of both endpoints. */
  totalDays: number;
  workingDays: number;
  weekendDays: number;
}

export interface CountdownInputs {
  target: DateParts;
  today: DateParts;
}

export interface CountdownResult {
  target: DateParts;
  today: DateParts;
  /** +future / −past / 0 today. */
  daysUntil: number;
  isPast: boolean;
  isToday: boolean;
  /** Duration from the earlier date to the later one. */
  duration: YMD;
  targetWeekday: string;
}

// ── Shared validation ────────────────────────────────────────

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

function invalidDate(field: string): CalculationError {
  return fail("Enter a valid date", field);
}

/** Largest shift we accept — keeps serial math comfortably safe. */
const MAX_DAY_SHIFT = 1_000_000;

// ── Mode A: date difference ──────────────────────────────────

export function calculateDateDifference(
  inputs: DateDifferenceInputs,
): CalculationResult<DateDifferenceResult> {
  const { from, to } = inputs;
  if (!isValidDate(from)) return invalidDate("from");
  if (!isValidDate(to)) return invalidDate("to");

  const reversed = compareDates(from, to) > 0;
  const earlier = reversed ? to : from;
  const later = reversed ? from : to;

  return {
    ok: true,
    data: {
      ...diffYMD(earlier, later),
      from,
      to,
      earlier,
      later,
      reversed,
      totalDays: daysBetween(earlier, later),
      fromWeekday: weekdayName(from),
      toWeekday: weekdayName(to),
    },
  };
}

// ── Mode B: add / subtract days ──────────────────────────────

export function addDays(
  inputs: AddDaysInputs,
): CalculationResult<AddDaysResult> {
  const { date, amount } = inputs;
  if (!isValidDate(date)) return invalidDate("date");
  if (!Number.isInteger(amount) || Math.abs(amount) > MAX_DAY_SHIFT) {
    return fail("Enter a whole number of days up to 1,000,000", "amount");
  }

  const result = fromSerial(toSerial(date) + amount);
  const abs = Math.abs(amount);

  return {
    ok: true,
    data: {
      start: date,
      result,
      amount,
      weeks: Math.floor(abs / 7),
      remainderDays: abs % 7,
      resultWeekday: weekdayName(result),
    },
  };
}

// ── Mode C: working days ─────────────────────────────────────

/**
 * Mon–Fri days in [from, to] inclusive. Full weeks contribute exactly
 * five working days each; the leading/trailing partial week is counted
 * day by day from the earlier date's weekday.
 */
export function calculateWorkingDays(
  inputs: WorkingDaysInputs,
): CalculationResult<WorkingDaysResult> {
  const { from, to } = inputs;
  if (!isValidDate(from)) return invalidDate("from");
  if (!isValidDate(to)) return invalidDate("to");

  const reversed = compareDates(from, to) > 0;
  const earlier = reversed ? to : from;
  const later = reversed ? from : to;

  const totalDays = daysBetween(earlier, later) + 1; // inclusive
  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays - fullWeeks * 7;
  const startIdx = weekdayIndex(earlier);

  let workingDays = fullWeeks * 5;
  for (let i = 0; i < remainder; i++) {
    const idx = (startIdx + i) % 7;
    if (idx >= 1 && idx <= 5) workingDays += 1; // Mon..Fri
  }

  return {
    ok: true,
    data: {
      from,
      to,
      earlier,
      later,
      reversed,
      totalDays,
      workingDays,
      weekendDays: totalDays - workingDays,
    },
  };
}

// ── Mode D: countdown ─────────────────────────────────────────

export function calculateCountdown(
  inputs: CountdownInputs,
): CalculationResult<CountdownResult> {
  const { target, today } = inputs;
  if (!isValidDate(target)) return invalidDate("target");
  if (!isValidDate(today)) return invalidDate("today");

  const order = compareDates(target, today);
  const isToday = order === 0;
  const isPast = order < 0;
  const daysUntil = daysBetween(today, target); // signed by construction

  const duration = isToday
    ? { years: 0, months: 0, days: 0 }
    : isPast
      ? diffYMD(target, today)
      : diffYMD(today, target);

  return {
    ok: true,
    data: {
      target,
      today,
      daysUntil,
      isPast,
      isToday,
      duration,
      targetWeekday: weekdayName(target),
    },
  };
}

