import { describe, expect, it } from "vitest";
import {
  addDays,
  calculateCountdown,
  calculateDateDifference,
  calculateWorkingDays,
} from "../date-time-calculator";
import { weekdayName, type DateParts } from "../age-calculator";

// ── Fixtures ─────────────────────────────────────────────────

const d = (year: number, month: number, day: number): DateParts => ({
  year,
  month,
  day,
});

// ── Mode A: date difference ──────────────────────────────────

describe("calculateDateDifference", () => {
  it("returns zero for the same date", () => {
    const r = calculateDateDifference({ from: d(2026, 7, 4), to: d(2026, 7, 4) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      reversed: false,
    });
  });

  it("computes Y/M/D, total days and both weekdays", () => {
    // 29 Feb 2024 (Thursday) → 8 Nov 2026 (Sunday).
    const r = calculateDateDifference({ from: d(2024, 2, 29), to: d(2026, 11, 8) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(2);
    expect(r.data.months).toBe(8);
    expect(r.data.days).toBe(10);
    expect(r.data.totalDays).toBe(983);
    expect(r.data.fromWeekday).toBe("Thursday");
    expect(r.data.toWeekday).toBe("Sunday");
    expect(r.data.reversed).toBe(false);
    expect(r.data.earlier).toEqual(d(2024, 2, 29));
    expect(r.data.later).toEqual(d(2026, 11, 8));
  });

  it("is order-independent — reversed inputs flip only the flag", () => {
    const a = calculateDateDifference({ from: d(2000, 1, 15), to: d(2010, 6, 20) });
    const b = calculateDateDifference({ from: d(2010, 6, 20), to: d(2000, 1, 15) });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    expect(a.data.reversed).toBe(false);
    expect(b.data.reversed).toBe(true);
    expect(b.data.years).toBe(a.data.years);
    expect(b.data.months).toBe(a.data.months);
    expect(b.data.days).toBe(a.data.days);
    expect(b.data.totalDays).toBe(a.data.totalDays);
    expect(b.data.earlier).toEqual(a.data.earlier);
    expect(b.data.fromWeekday).toBe(a.data.toWeekday);
  });

  it("crosses leap days in the day count", () => {
    const r = calculateDateDifference({ from: d(2024, 2, 28), to: d(2024, 3, 1) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.totalDays).toBe(2); // 29 Feb sits in between
  });

  it("rejects invalid dates with per-field errors", () => {
    const r = calculateDateDifference({ from: d(2023, 2, 30), to: d(2026, 1, 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.from).toBe("Enter a valid date");
  });
});

// ── Mode B: add / subtract days ──────────────────────────────

describe("addDays", () => {
  it("adds across a month boundary", () => {
    const r = addDays({ date: d(2026, 1, 31), amount: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2026, 2, 1));
    expect(r.data.resultWeekday).toBe(weekdayName(d(2026, 2, 1)));
  });

  it("steps over 29 February in a leap year", () => {
    const r = addDays({ date: d(2024, 2, 28), amount: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2024, 2, 29));
  });

  it("subtracts across 29 February", () => {
    const r = addDays({ date: d(2024, 3, 1), amount: -1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2024, 2, 29));
  });

  it("crosses a year boundary", () => {
    const r = addDays({ date: d(2026, 12, 31), amount: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2027, 1, 1));
  });

  it("handles a 365-day shift across a leap year", () => {
    // 2024 has 366 days: 1 Jan 2024 + 365 lands on 31 Dec 2024.
    const fwd = addDays({ date: d(2024, 1, 1), amount: 365 });
    expect(fwd.ok && fwd.data.result).toEqual(d(2024, 12, 31));
    const back = addDays({ date: d(2025, 1, 1), amount: -366 });
    expect(back.ok && back.data.result).toEqual(d(2024, 1, 1));
  });

  it("amount 0 returns the same date", () => {
    const r = addDays({ date: d(2026, 11, 8), amount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2026, 11, 8));
    expect(r.data.weeks).toBe(0);
    expect(r.data.remainderDays).toBe(0);
  });

  it("splits the shift into weeks and leftover days", () => {
    const r = addDays({ date: d(2026, 1, 1), amount: 100 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.weeks).toBe(14); // 100 = 14 × 7 + 2
    expect(r.data.remainderDays).toBe(2);
    expect(r.data.result).toEqual(d(2026, 4, 11));
    expect(r.data.resultWeekday).toBe(weekdayName(d(2026, 4, 11)));
  });

  it("a full week lands on the same weekday", () => {
    const start = d(2026, 11, 8); // Sunday
    const r = addDays({ date: start, amount: 7 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toEqual(d(2026, 11, 15));
    expect(r.data.resultWeekday).toBe("Sunday");
  });

  it("rejects fractional, non-finite and oversized amounts", () => {
    for (const amount of [1.5, NaN, Infinity, 2_000_000]) {
      const r = addDays({ date: d(2026, 1, 1), amount });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fieldErrors?.amount).toBeTruthy();
    }
  });

  it("rejects an invalid start date", () => {
    const r = addDays({ date: d(2023, 4, 31), amount: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.date).toBe("Enter a valid date");
  });
});

// ── Mode C: working days ─────────────────────────────────────

describe("calculateWorkingDays", () => {
  it("counts a Mon–Fri work week fully", () => {
    // 2 Nov 2026 = Monday, 6 Nov 2026 = Friday.
    const r = calculateWorkingDays({ from: d(2026, 11, 2), to: d(2026, 11, 6) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      totalDays: 5,
      workingDays: 5,
      weekendDays: 0,
      reversed: false,
    });
  });

  it("includes both endpoints — Fri → Mon spans the weekend", () => {
    const r = calculateWorkingDays({ from: d(2026, 11, 6), to: d(2026, 11, 9) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      totalDays: 4,
      workingDays: 2,
      weekendDays: 2,
    });
  });

  it("counts two full weeks as 10 working / 4 weekend days", () => {
    // Mon 2 Nov → Sun 15 Nov 2026 (inclusive = 14 days).
    const r = calculateWorkingDays({ from: d(2026, 11, 2), to: d(2026, 11, 15) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      totalDays: 14,
      workingDays: 10,
      weekendDays: 4,
    });
  });

  it("handles a partial leading/trailing week (Thu → Mon)", () => {
    // Thu 5 Nov → Mon 9 Nov: Thu, Fri, Sat, Sun, Mon.
    const r = calculateWorkingDays({ from: d(2026, 11, 5), to: d(2026, 11, 9) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      totalDays: 5,
      workingDays: 3,
      weekendDays: 2,
    });
  });

  it("a single day classifies by its own weekday", () => {
    const sun = calculateWorkingDays({ from: d(2026, 11, 8), to: d(2026, 11, 8) });
    expect(sun.ok && sun.data).toMatchObject({
      totalDays: 1,
      workingDays: 0,
      weekendDays: 1,
    });

    const fri = calculateWorkingDays({ from: d(2026, 11, 6), to: d(2026, 11, 6) });
    expect(fri.ok && fri.data).toMatchObject({
      totalDays: 1,
      workingDays: 1,
      weekendDays: 0,
    });
  });

  it("is order-independent", () => {
    const a = calculateWorkingDays({ from: d(2026, 11, 2), to: d(2026, 11, 9) });
    const b = calculateWorkingDays({ from: d(2026, 11, 9), to: d(2026, 11, 2) });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.data.reversed).toBe(true);
    expect(b.data.workingDays).toBe(a.data.workingDays);
    expect(b.data.weekendDays).toBe(a.data.weekendDays);
    expect(b.data.totalDays).toBe(a.data.totalDays);
  });

  it("rejects invalid dates", () => {
    const r = calculateWorkingDays({ from: d(2026, 1, 1), to: d(2026, 2, 30) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.to).toBe("Enter a valid date");
  });
});

// ── Mode D: countdown ─────────────────────────────────────────

describe("calculateCountdown", () => {
  it("counts down to a future date with a Y/M/D duration", () => {
    // Today 8 Nov 2026 (Sunday) → 1 Jan 2027 (Friday).
    const r = calculateCountdown({ target: d(2027, 1, 1), today: d(2026, 11, 8) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.daysUntil).toBe(54);
    expect(r.data.isPast).toBe(false);
    expect(r.data.isToday).toBe(false);
    expect(r.data.duration).toEqual({ years: 0, months: 1, days: 24 });
    expect(r.data.targetWeekday).toBe("Friday");
  });

  it("reports a past date with a negative count", () => {
    const r = calculateCountdown({ target: d(2026, 1, 1), today: d(2026, 11, 8) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.daysUntil).toBe(-311);
    expect(r.data.isPast).toBe(true);
    expect(r.data.isToday).toBe(false);
    expect(r.data.duration).toEqual({ years: 0, months: 10, days: 7 });
    expect(r.data.targetWeekday).toBe("Thursday");
  });

  it("zero when target equals today", () => {
    const r = calculateCountdown({ target: d(2026, 11, 8), today: d(2026, 11, 8) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.daysUntil).toBe(0);
    expect(r.data.isToday).toBe(true);
    expect(r.data.isPast).toBe(false);
    expect(r.data.duration).toEqual({ years: 0, months: 0, days: 0 });
    expect(r.data.targetWeekday).toBe("Sunday");
  });

  it("rejects invalid dates on either side", () => {
    const badTarget = calculateCountdown({ target: d(2026, 2, 30), today: d(2026, 11, 8) });
    expect(badTarget.ok).toBe(false);
    if (!badTarget.ok) expect(badTarget.fieldErrors?.target).toBe("Enter a valid date");

    const badToday = calculateCountdown({ target: d(2027, 1, 1), today: d(2026, 13, 1) });
    expect(badToday.ok).toBe(false);
    if (!badToday.ok) expect(badToday.fieldErrors?.today).toBe("Enter a valid date");
  });
});
