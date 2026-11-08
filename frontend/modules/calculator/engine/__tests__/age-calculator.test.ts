import { describe, expect, it } from "vitest";
import {
  WEEKDAY_NAMES,
  calculateAge,
  calculateAgeDifference,
  calculateAgeOnDate,
  compareDates,
  daysBetween,
  daysInMonth,
  diffYMD,
  formatDateParts,
  formatAgeFull,
  formatAgeShort,
  fromSerial,
  isLeapYear,
  isValidDate,
  parseDateInput,
  toSerial,
  weekdayIndex,
  weekdayName,
  type DateParts,
} from "../age-calculator";

// ── Fixtures ─────────────────────────────────────────────────

const d = (year: number, month: number, day: number): DateParts => ({
  year,
  month,
  day,
});

// ── Parsing & validity ───────────────────────────────────────

describe("parseDateInput", () => {
  it("parses a well-formed YYYY-MM-DD date", () => {
    expect(parseDateInput("2000-01-15")).toEqual({
      year: 2000,
      month: 1,
      day: 15,
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDateInput("2023-02-30")).toBeNull();
    expect(parseDateInput("2026-13-01")).toBeNull();
    expect(parseDateInput("2023-02-29")).toBeNull();
  });

  it("accepts 29 Feb in a leap year", () => {
    expect(parseDateInput("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(parseDateInput("2000-02-29")).not.toBeNull();
  });

  it("rejects malformed shapes", () => {
    expect(parseDateInput("2000-1-5")).toBeNull();
    expect(parseDateInput("15/01/2000")).toBeNull();
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput("hello")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseDateInput("  2024-06-01  ")).toEqual({
      year: 2024,
      month: 6,
      day: 1,
    });
  });
});

describe("isValidDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidDate(d(2024, 2, 29))).toBe(true);
    expect(isValidDate(d(2023, 2, 29))).toBe(false);
    expect(isValidDate(d(2026, 0, 1))).toBe(false);
    expect(isValidDate(d(2026, 13, 1))).toBe(false);
    expect(isValidDate(d(2026, 4, 31))).toBe(false);
    expect(isValidDate(d(0, 1, 1))).toBe(false);
  });
});

// ── Leap years & month lengths ───────────────────────────────

describe("isLeapYear", () => {
  it("follows the Gregorian rule", () => {
    expect(isLeapYear(1900)).toBe(false); // century, not divisible by 400
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
  });
});

describe("daysInMonth", () => {
  it("returns correct month lengths incl. leap February", () => {
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

// ── Day arithmetic ───────────────────────────────────────────

describe("daysBetween", () => {
  it("counts leap days correctly", () => {
    // Non-leap: 28 Feb → 1 Mar is 1 day.
    expect(daysBetween(d(2023, 2, 28), d(2023, 3, 1))).toBe(1);
    // Leap: 28 Feb → 1 Mar crosses 29 Feb, so 2 days.
    expect(daysBetween(d(2024, 2, 28), d(2024, 3, 1))).toBe(2);
  });

  it("is signed — reversing the arguments negates the result", () => {
    expect(daysBetween(d(2026, 11, 7), d(2026, 11, 1))).toBe(-6);
    expect(daysBetween(d(2000, 1, 1), d(2000, 1, 1))).toBe(0);
  });

  it("counts a full leap year as 366 days", () => {
    expect(daysBetween(d(2000, 1, 1), d(2000, 12, 31))).toBe(365);
    expect(daysBetween(d(2000, 1, 1), d(2001, 1, 1))).toBe(366);
    expect(daysBetween(d(2023, 1, 1), d(2024, 1, 1))).toBe(365);
  });
});

describe("compareDates", () => {
  it("orders dates -1 / 0 / 1", () => {
    expect(compareDates(d(2026, 1, 1), d(2026, 1, 2))).toBe(-1);
    expect(compareDates(d(2026, 1, 2), d(2026, 1, 1))).toBe(1);
    expect(compareDates(d(2026, 1, 1), d(2026, 1, 1))).toBe(0);
  });
});

// ── Y/M/D difference ─────────────────────────────────────────

describe("diffYMD", () => {
  it("returns exact years when the anniversary has passed", () => {
    expect(diffYMD(d(2000, 6, 10), d(2026, 6, 10))).toEqual({
      years: 26,
      months: 0,
      days: 0,
    });
  });

  it("keeps the day remainder within a single month", () => {
    expect(diffYMD(d(2000, 1, 15), d(2026, 4, 10))).toEqual({
      years: 26,
      months: 2,
      days: 26,
    });
  });

  it("clamps month-end: Jan 31 → Feb 28 is 1 month in a non-leap year", () => {
    expect(diffYMD(d(2023, 1, 31), d(2023, 2, 28))).toEqual({
      years: 0,
      months: 1,
      days: 0,
    });
    // In a leap year Feb 28 is still short of "a month from Jan 31",
    // so it lands on 0 months + 28 days.
    expect(diffYMD(d(2024, 1, 31), d(2024, 2, 28))).toEqual({
      years: 0,
      months: 0,
      days: 28,
    });
  });

  it("handles 29 Feb birthdays (anniversary clamped to 28 Feb)", () => {
    expect(diffYMD(d(2000, 2, 29), d(2021, 2, 28))).toEqual({
      years: 21,
      months: 0,
      days: 0,
    });
  });

  it("counts a month that ends short of the start day", () => {
    // 31 Mar 2000 → 1 Mar 2001: not a full year, one month short.
    expect(diffYMD(d(2000, 3, 31), d(2001, 3, 1))).toEqual({
      years: 0,
      months: 11,
      days: 1,
    });
  });

  it("handles same-day and zero-month inputs", () => {
    expect(diffYMD(d(2026, 7, 4), d(2026, 7, 4))).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
    expect(diffYMD(d(2026, 7, 4), d(2026, 7, 20))).toEqual({
      years: 0,
      months: 0,
      days: 16,
    });
  });
});

// ── Formatting ───────────────────────────────────────────────

describe("formatting helpers", () => {
  it("formats a date as '15 Jan 2000'", () => {
    expect(formatDateParts(d(2000, 1, 15))).toBe("15 Jan 2000");
    expect(formatDateParts(d(2026, 12, 31))).toBe("31 Dec 2026");
  });

  it("maps serial days to weekday names (1970-01-01 = Thursday)", () => {
    expect(weekdayName(d(1970, 1, 1))).toBe("Thursday");
    expect(weekdayName(d(2026, 11, 7))).toBe("Saturday");
    expect(weekdayName(d(2000, 1, 1))).toBe("Saturday");
    expect(WEEKDAY_NAMES).toHaveLength(7);
  });

  it("handles pre-1970 dates (negative serials must not break the index)", () => {
    expect(weekdayName(d(1969, 12, 31))).toBe("Wednesday");
    expect(weekdayName(d(1965, 6, 15))).toBe("Tuesday");
    expect(weekdayIndex(d(1970, 1, 1))).toBe(4); // Thursday
    expect(weekdayIndex(d(1969, 12, 31))).toBe(3); // Wednesday
  });

  it("round-trips dates through day serials", () => {
    expect(toSerial(d(1970, 1, 1))).toBe(0);
    expect(toSerial(d(1969, 12, 31))).toBe(-1);
    const cases = [
      d(1, 1, 1),
      d(1965, 6, 15),
      d(2000, 2, 29),
      d(2024, 12, 31),
      d(2026, 11, 8),
    ];
    for (const c of cases) expect(fromSerial(toSerial(c))).toEqual(c);
    expect(fromSerial(0)).toEqual(d(1970, 1, 1));
    expect(fromSerial(-1)).toEqual(d(1969, 12, 31));
  });

  it("pluralises correctly in the full form", () => {
    expect(formatAgeFull(1, 1, 1)).toBe("1 year 1 month 1 day");
    expect(formatAgeFull(0, 0, 0)).toBe("0 years 0 months 0 days");
    expect(formatAgeFull(26, 10, 23)).toBe("26 years 10 months 23 days");
  });

  it("produces the compact headline form", () => {
    expect(formatAgeShort(26, 10, 23)).toBe("26y 10m 23d");
    expect(formatAgeShort(0, 0, 0)).toBe("0y 0m 0d");
  });
});

// ── Mode A: current age ──────────────────────────────────────

describe("calculateAge (current age)", () => {
  const birth = d(2000, 1, 15);
  const today = d(2026, 11, 7);

  it("computes exact age, total days and the next-birthday countdown", () => {
    const result = calculateAge({ birthDate: birth, today });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.years).toBe(26);
    expect(result.data.months).toBe(9);
    expect(result.data.days).toBe(23);
    expect(result.data.totalDays).toBe(9793);
    expect(result.data.totalDays).toBe(daysBetween(birth, today));
    expect(result.data.nextBirthday).toEqual(d(2027, 1, 15));
    expect(result.data.daysUntilBirthday).toBe(69);
    expect(result.data.birthdayIsToday).toBe(false);
    expect(result.data.ageAtNextBirthday).toBe(27);
    expect(result.data.nextBirthdayWeekday).toBe("Friday");
  });

  it("reports a birthday-today as zero everywhere", () => {
    const result = calculateAge({ birthDate: d(1990, 6, 15), today: d(2026, 6, 15) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.years).toBe(36);
    expect(result.data.months).toBe(0);
    expect(result.data.days).toBe(0);
    expect(result.data.birthdayIsToday).toBe(true);
    expect(result.data.daysUntilBirthday).toBe(0);
    expect(result.data.nextBirthday).toEqual(d(2026, 6, 15));
    expect(result.data.ageAtNextBirthday).toBe(37);
  });

  it("uses 28 Feb as the birthday in non-leap years (29 Feb birth)", () => {
    const birth = d(2000, 2, 29);

    // On 28 Feb 2026 the birthday counts as today (28 Feb anchor).
    const onDay = calculateAge({ birthDate: birth, today: d(2026, 2, 28) });
    expect(onDay.ok).toBe(true);
    if (onDay.ok) {
      expect(onDay.data.birthdayIsToday).toBe(true);
      expect(onDay.data.daysUntilBirthday).toBe(0);
      expect(onDay.data.years).toBe(26);
    }

    // On 1 Mar 2026 the age is one day past the anniversary.
    const after = calculateAge({ birthDate: birth, today: d(2026, 3, 1) });
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data.years).toBe(26);
      expect(after.data.months).toBe(0);
      expect(after.data.days).toBe(1);
      expect(after.data.nextBirthday).toEqual(d(2027, 2, 28));
      expect(after.data.daysUntilBirthday).toBe(364);
    }
  });

  it("counts from the day after a birthday to the next one", () => {
    const result = calculateAge({ birthDate: d(2000, 1, 15), today: d(2026, 1, 16) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.years).toBe(26);
    expect(result.data.days).toBe(1);
    expect(result.data.nextBirthday).toEqual(d(2027, 1, 15));
    expect(result.data.daysUntilBirthday).toBe(364);
  });

  it("rejects a future date of birth", () => {
    const result = calculateAge({ birthDate: d(2030, 1, 1), today });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Date of birth cannot be in the future");
    expect(result.fieldErrors?.birthDate).toBeTruthy();
  });

  it("rejects invalid dates", () => {
    const bad = calculateAge({ birthDate: d(2023, 2, 30), today });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fieldErrors?.birthDate).toBe("Enter a valid date");
  });
});

// ── Mode B: age on a date ────────────────────────────────────

describe("calculateAgeOnDate", () => {
  it("computes the age on an arbitrary past date", () => {
    const result = calculateAgeOnDate({
      birthDate: d(2000, 1, 15),
      date: d(2010, 6, 20),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.years).toBe(10);
    expect(result.data.months).toBe(5);
    expect(result.data.days).toBe(5);
    expect(result.data.totalDays).toBe(daysBetween(d(2000, 1, 15), d(2010, 6, 20)));
  });

  it("works for a future date (age yet to be reached)", () => {
    const result = calculateAgeOnDate({
      birthDate: d(2020, 6, 1),
      date: d(2030, 6, 1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.years).toBe(10);
    expect(result.data.months).toBe(0);
    expect(result.data.days).toBe(0);
  });

  it("returns zero on the birth date itself", () => {
    const result = calculateAgeOnDate({
      birthDate: d(2020, 6, 1),
      date: d(2020, 6, 1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ years: 0, months: 0, days: 0, totalDays: 0 });
  });

  it("rejects a date before the date of birth", () => {
    const result = calculateAgeOnDate({
      birthDate: d(2000, 1, 15),
      date: d(1999, 12, 31),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Date cannot be before the date of birth");
    expect(result.fieldErrors?.date).toBeTruthy();
  });

  it("rejects invalid dates", () => {
    const result = calculateAgeOnDate({
      birthDate: d(2024, 2, 30),
      date: d(2026, 1, 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.birthDate).toBe("Enter a valid date");
  });
});

// ── Mode C: age difference ───────────────────────────────────

describe("calculateAgeDifference", () => {
  it("reports the older person first when input order is older-first", () => {
    const result = calculateAgeDifference({
      first: d(1990, 5, 10),
      second: d(1992, 8, 20),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.older).toBe("first");
    expect(result.data.years).toBe(2);
    expect(result.data.months).toBe(3);
    expect(result.data.days).toBe(10);
    expect(result.data.totalDays).toBe(833);
    expect(result.data.totalDays).toBe(daysBetween(d(1990, 5, 10), d(1992, 8, 20)));
  });

  it("is order-independent — swapping the inputs flips only 'older'", () => {
    const a = calculateAgeDifference({
      first: d(1990, 5, 10),
      second: d(1992, 8, 20),
    });
    const b = calculateAgeDifference({
      first: d(1992, 8, 20),
      second: d(1990, 5, 10),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    expect(b.data.older).toBe("second");
    expect(b.data.years).toBe(a.data.years);
    expect(b.data.months).toBe(a.data.months);
    expect(b.data.days).toBe(a.data.days);
    expect(b.data.totalDays).toBe(a.data.totalDays);
  });

  it("reports 'same' with zero difference for identical dates", () => {
    const result = calculateAgeDifference({
      first: d(2000, 1, 1),
      second: d(2000, 1, 1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.older).toBe("same");
    expect(result.data).toMatchObject({ years: 0, months: 0, days: 0, totalDays: 0 });
  });

  it("rejects invalid dates with a per-field error", () => {
    const result = calculateAgeDifference({
      first: d(2026, 4, 31),
      second: d(2000, 1, 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.first).toBe("Enter a valid date");
  });
});
