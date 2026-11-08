/**
 * Age Calculator – calculation engine.
 *
 * Pure calendar date arithmetic (PRD §14): no `eval`, no mutation, no
 * dependence on "now" — every function takes the dates it needs, so the
 * tests pin exact answers forever.
 *
 * Modes:
 *   A. Current age    — date of birth + today → exact Y/M/D, total days
 *                       lived, next-birthday countdown and weekday
 *   B. Age on a date  — date of birth + any date → age on that day
 *   C. Age difference — two birth dates → Y/M/D apart + who is older
 *
 * Calendar rules (documented, tested, and consistent across modes):
 *   - Month-end clamping: adding a month to Jan 31 lands on Feb 28/29
 *     (the real length of the target month), never on "Feb 31".
 *   - A 29 February birthday is celebrated on 28 February in non-leap
 *     years — the same anchor diffYMD uses, so countdown and age agree.
 *   - diffYMD(from, to) is the largest (years, months) with
 *     from + Y/M ≤ to, then the exact day remainder — which keeps days
 *     between 0 and ~31 and makes from + result == to hold on a calendar.
 *
 * Validation: every function returns a discriminated CalculationResult.
 */

import type {
  CalculationError,
  CalculationResult,
} from "../types";

// ── Types ────────────────────────────────────────────────────

/** A calendar date (no time, no timezone — the input format is YYYY-MM-DD). */
export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Years / months / days breakdown. */
export interface YMD {
  years: number;
  months: number;
  days: number;
}

export interface AgeResult extends YMD {
  birthDate: DateParts;
  today: DateParts;
  /** Total days from birth to today. */
  totalDays: number;
  /** Next birthday occurrence (this year's if still ahead, else next year's). */
  nextBirthday: DateParts;
  /** 0 when the birthday is today. */
  daysUntilBirthday: number;
  birthdayIsToday: boolean;
  /** Age the person turns at the next birthday (always years + 1). */
  ageAtNextBirthday: number;
  nextBirthdayWeekday: string;
}

export interface AgeOnDateResult extends YMD {
  birthDate: DateParts;
  date: DateParts;
  totalDays: number;
}

export interface AgeDifferenceResult extends YMD {
  first: DateParts;
  second: DateParts;
  /** Whose birth date comes first — the older person (or "same"). */
  older: "first" | "second" | "same";
  totalDays: number;
}

// ── Calendar helpers ─────────────────────────────────────────

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 0 = Sunday … 6 = Saturday. */
export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

/**
 * Strict YYYY-MM-DD parser. Rejects impossible calendar dates
 * (2023-02-30, 2026-13-01) and anything not exactly that shape.
 */
export function parseDateInput(raw: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Structural check for DateParts handed straight to a calculate function. */
export function isValidDate(d: DateParts): boolean {
  if (!Number.isInteger(d.year) || d.year < 1) return false;
  if (!Number.isInteger(d.month) || d.month < 1 || d.month > 12) return false;
  if (!Number.isInteger(d.day) || d.day < 1) return false;
  return d.day <= daysInMonth(d.year, d.month);
}

/** Day serial number (days since 1970-01-01, timezone-independent). */
export function toSerial(d: DateParts): number {
  const date = new Date(0); // epoch, midnight UTC
  date.setUTCFullYear(d.year, d.month - 1, d.day);
  date.setUTCHours(0, 0, 0, 0);
  return Math.round(date.getTime() / 86_400_000);
}

/** Inverse of toSerial — calendar date from its day serial number. */
export function fromSerial(serial: number): DateParts {
  const date = new Date(serial * 86_400_000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Signed whole days from a to b (positive when b is later). */
export function daysBetween(a: DateParts, b: DateParts): number {
  return toSerial(b) - toSerial(a);
}

/** -1 / 0 / 1 by date order. */
export function compareDates(a: DateParts, b: DateParts): number {
  const diff = toSerial(a) - toSerial(b);
  return diff === 0 ? 0 : diff > 0 ? 1 : -1;
}

/** Add whole months, clamping the day to the target month's length. */
function addMonthsClamped(d: DateParts, months: number): DateParts {
  const total = d.year * 12 + (d.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

/**
 * Calendar-accurate Y/M/D difference (expects from ≤ to).
 *
 * The largest (years, months) such that from + Y/M lands on or before
 * `to` — using month-end clamping — then the exact day remainder, so
 * days is always 0…~31 and from + result == to on a real calendar.
 */
export function diffYMD(from: DateParts, to: DateParts): YMD {
  let totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
  if (totalMonths > 0 && compareDates(addMonthsClamped(from, totalMonths), to) > 0) {
    totalMonths -= 1;
  }
  const anchor = totalMonths > 0 ? addMonthsClamped(from, totalMonths) : from;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths - years * 12;
  return { years, months, days: daysBetween(anchor, to) };
}

// ── Formatting ───────────────────────────────────────────────

/** "15 Jan 2000" */
export function formatDateParts(d: DateParts): string {
  return `${d.day} ${MONTH_ABBR[d.month - 1]} ${d.year}`;
}

/** 0 = Sunday … 6 = Saturday — works for any date, pre-epoch included. */
export function weekdayIndex(d: DateParts): number {
  return (((toSerial(d) + 4) % 7) + 7) % 7;
}

/** "Friday" — weekday of the given calendar date. */
export function weekdayName(d: DateParts): string {
  return WEEKDAY_NAMES[weekdayIndex(d)];
}

/** "26 years 10 months 23 days" (singular where appropriate). */
export function formatAgeFull(years: number, months: number, days: number): string {
  const y = `${years} year${years === 1 ? "" : "s"}`;
  const m = `${months} month${months === 1 ? "" : "s"}`;
  const d = `${days} day${days === 1 ? "" : "s"}`;
  return `${y} ${m} ${d}`;
}

/** "26y 10m 23d" — compact headline form. */
export function formatAgeShort(years: number, months: number, days: number): string {
  return `${years}y ${months}m ${days}d`;
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

// ── Mode A: current age ──────────────────────────────────────

export interface AgeInputs {
  birthDate: DateParts;
  /** The reference day ("today" supplied by the caller — engines stay pure). */
  today: DateParts;
}

/**
 * Exact age today plus the next-birthday countdown.
 * A future date of birth is the only validation error.
 */
export function calculateAge(inputs: AgeInputs): CalculationResult<AgeResult> {
  const { birthDate, today } = inputs;
  if (!isValidDate(birthDate)) return invalidDate("birthDate");
  if (!isValidDate(today)) return invalidDate("today");
  if (compareDates(birthDate, today) > 0) {
    return fail("Date of birth cannot be in the future", "birthDate");
  }

  const ymd = diffYMD(birthDate, today);
  const totalDays = daysBetween(birthDate, today);

  // Next occurrence: this year's anniversary if still ahead, else next year's.
  let nextBirthday = anniversaryIn(birthDate, today.year);
  if (compareDates(nextBirthday, today) < 0) {
    nextBirthday = anniversaryIn(birthDate, today.year + 1);
  }
  const daysUntilBirthday = daysBetween(today, nextBirthday);

  return {
    ok: true,
    data: {
      ...ymd,
      birthDate,
      today,
      totalDays,
      nextBirthday,
      daysUntilBirthday,
      birthdayIsToday: daysUntilBirthday === 0,
      ageAtNextBirthday: ymd.years + 1,
      nextBirthdayWeekday: weekdayName(nextBirthday),
    },
  };
}

/** Where the birthday falls in `year` (29 Feb → 28 Feb outside leaps). */
function anniversaryIn(birth: DateParts, year: number): DateParts {
  if (birth.month === 2 && birth.day === 29) {
    return { year, month: 2, day: isLeapYear(year) ? 29 : 28 };
  }
  return { year, month: birth.month, day: birth.day };
}

// ── Mode B: age on a date ────────────────────────────────────

export interface AgeOnDateInputs {
  birthDate: DateParts;
  date: DateParts;
}

/** Age reached on any given date (past or future). */
export function calculateAgeOnDate(
  inputs: AgeOnDateInputs,
): CalculationResult<AgeOnDateResult> {
  const { birthDate, date } = inputs;
  if (!isValidDate(birthDate)) return invalidDate("birthDate");
  if (!isValidDate(date)) return invalidDate("date");
  if (compareDates(date, birthDate) < 0) {
    return fail("Date cannot be before the date of birth", "date");
  }

  return {
    ok: true,
    data: {
      ...diffYMD(birthDate, date),
      birthDate,
      date,
      totalDays: daysBetween(birthDate, date),
    },
  };
}

// ── Mode C: age difference ───────────────────────────────────

export interface AgeDifferenceInputs {
  first: DateParts;
  second: DateParts;
}

/** How far apart two birthdays are, and who was born first (older). */
export function calculateAgeDifference(
  inputs: AgeDifferenceInputs,
): CalculationResult<AgeDifferenceResult> {
  const { first, second } = inputs;
  if (!isValidDate(first)) return invalidDate("first");
  if (!isValidDate(second)) return invalidDate("second");

  const order = compareDates(first, second);
  const earlier = order <= 0 ? first : second;
  const later = order <= 0 ? second : first;

  return {
    ok: true,
    data: {
      ...diffYMD(earlier, later),
      first,
      second,
      older: order === 0 ? "same" : order < 0 ? "first" : "second",
      totalDays: daysBetween(earlier, later),
    },
  };
}
