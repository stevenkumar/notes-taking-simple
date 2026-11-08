/**
 * Turns raw date strings into a validated ResultView via the age engine.
 *
 * The reference day ("today") is passed in by the component rather than
 * read from the clock here — the engine stays pure and the component can
 * set today in an effect (no hydration mismatch between server and client).
 * An empty `today` keeps mode A "incomplete" for the first paint.
 */

import {
  calculateAge,
  calculateAgeDifference,
  calculateAgeOnDate,
  formatDateParts,
  formatAgeFull,
  formatAgeShort,
  parseDateInput,
  weekdayName,
} from "../../engine/age-calculator";
import type { ComputeState } from "../shared/result-types";
import type { AgeForm, AgeModeId } from "./types";

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeAgeResult(
  mode: AgeModeId,
  form: AgeForm,
  today: string,
): ComputeState {
  switch (mode) {
    case "current":
      return computeCurrent(form, today);
    case "on-date":
      return computeOnDate(form);
    case "difference":
      return computeDifference(form);
  }
}

// ── Mode A: current age ──────────────────────────────────────

function computeCurrent(form: AgeForm, today: string): ComputeState {
  if (!form.birthDate.trim() || !today.trim()) return incomplete();

  const birthDate = parseDateInput(form.birthDate);
  if (!birthDate) return errorOf("Enter a valid date of birth (YYYY-MM-DD)");
  const todayParts = parseDateInput(today);
  if (!todayParts) return errorOf("Could not read today's date");

  const r = calculateAge({ birthDate, today: todayParts });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const birthdayLine = d.birthdayIsToday
    ? "Today is the birthday!"
    : `${formatDateParts(d.nextBirthday)} (${d.nextBirthdayWeekday}) · in ${d.daysUntilBirthday} day${d.daysUntilBirthday === 1 ? "" : "s"}`;

  return {
    state: "ok",
    view: {
      headlineLabel: "Age today",
      headlineValue: formatAgeShort(d.years, d.months, d.days),
      subLabel: "Next birthday",
      subValue: birthdayLine,
      rows: [
        { label: "Date of birth", value: formatDateParts(d.birthDate) },
        { label: "Today", value: `${formatDateParts(d.today)} (${weekdayName(d.today)})` },
        {
          label: "Exact age",
          value: formatAgeFull(d.years, d.months, d.days),
          emphasis: true,
        },
        { label: "Total days lived", value: d.totalDays.toLocaleString("en-IN") },
        {
          label: "Next birthday",
          value: d.birthdayIsToday
            ? "Today"
            : `${formatDateParts(d.nextBirthday)} (${d.nextBirthdayWeekday})`,
        },
        {
          label: "Days until birthday",
          value: d.birthdayIsToday ? "0 — it's today" : String(d.daysUntilBirthday),
        },
        { label: "Age at next birthday", value: `${d.ageAtNextBirthday} years` },
      ],
      note: d.birthdayIsToday
        ? `Born ${formatDateParts(d.birthDate)} — 🎂 ${d.ageAtNextBirthday} years old today.`
        : `Born ${formatDateParts(d.birthDate)} · ${formatAgeFull(d.years, d.months, d.days)} old · ${d.totalDays.toLocaleString("en-IN")} days lived.`,
      copyText: [
        "Age Calculator — Current Age",
        `Date of birth: ${formatDateParts(d.birthDate)}`,
        `Today: ${formatDateParts(d.today)}`,
        `Exact age: ${formatAgeFull(d.years, d.months, d.days)}`,
        `Total days lived: ${d.totalDays}`,
        d.birthdayIsToday
          ? "Next birthday: today"
          : `Next birthday: ${formatDateParts(d.nextBirthday)} (${d.nextBirthdayWeekday}) — in ${d.daysUntilBirthday} days`,
        `Age at next birthday: ${d.ageAtNextBirthday} years`,
      ].join("\n"),
    },
  };
}

// ── Mode B: age on a date ────────────────────────────────────

function computeOnDate(form: AgeForm): ComputeState {
  if (!form.birthDate.trim() || !form.date.trim()) return incomplete();

  const birthDate = parseDateInput(form.birthDate);
  if (!birthDate) return errorOf("Enter a valid date of birth (YYYY-MM-DD)");
  const date = parseDateInput(form.date);
  if (!date) return errorOf("Enter a valid date (YYYY-MM-DD)");

  const r = calculateAgeOnDate({ birthDate, date });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: `Age on ${formatDateParts(d.date)}`,
      headlineValue: formatAgeShort(d.years, d.months, d.days),
      subLabel: "Total days",
      subValue: `${d.totalDays.toLocaleString("en-IN")} days`,
      rows: [
        { label: "Date of birth", value: formatDateParts(d.birthDate) },
        { label: "Reference date", value: `${formatDateParts(d.date)} (${weekdayName(d.date)})` },
        {
          label: "Age on that date",
          value: formatAgeFull(d.years, d.months, d.days),
          emphasis: true,
        },
        { label: "Total days from birth", value: d.totalDays.toLocaleString("en-IN") },
      ],
      note: `From ${formatDateParts(d.birthDate)} to ${formatDateParts(d.date)} — ${formatAgeFull(d.years, d.months, d.days)}.`,
      copyText: [
        "Age Calculator — Age on Date",
        `Date of birth: ${formatDateParts(d.birthDate)}`,
        `Reference date: ${formatDateParts(d.date)}`,
        `Age on that date: ${formatAgeFull(d.years, d.months, d.days)}`,
        `Total days: ${d.totalDays}`,
      ].join("\n"),
    },
  };
}

// ── Mode C: age difference ───────────────────────────────────

function computeDifference(form: AgeForm): ComputeState {
  if (!form.first.trim() || !form.second.trim()) return incomplete();

  const first = parseDateInput(form.first);
  if (!first) return errorOf("Enter a valid first date (YYYY-MM-DD)");
  const second = parseDateInput(form.second);
  if (!second) return errorOf("Enter a valid second date (YYYY-MM-DD)");

  const r = calculateAgeDifference({ first, second });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const same = d.older === "same";
  const olderLine = same
    ? "Both were born on the same day"
    : `Older: ${d.older === "first" ? "First" : "Second"} person (${formatDateParts(d.older === "first" ? d.first : d.second)})`;

  return {
    state: "ok",
    view: {
      headlineLabel: "Age difference",
      headlineValue: formatAgeShort(d.years, d.months, d.days),
      subLabel: "Who is older",
      subValue: same ? "Same age" : d.older === "first" ? "First person" : "Second person",
      rows: [
        { label: "First birth date", value: formatDateParts(d.first) },
        { label: "Second birth date", value: formatDateParts(d.second) },
        {
          label: "Difference",
          value: formatAgeFull(d.years, d.months, d.days),
          emphasis: true,
        },
        { label: "Days between", value: d.totalDays.toLocaleString("en-IN") },
        { label: "Older", value: same ? "Both same" : d.older === "first" ? "First person" : "Second person" },
      ],
      note: same
        ? `Both dates are ${formatDateParts(d.first)} — zero difference.`
        : `${formatDateParts(d.first)} vs ${formatDateParts(d.second)} — ${olderLine}, ${formatAgeFull(d.years, d.months, d.days)} apart.`,
      copyText: [
        "Age Calculator — Age Difference",
        `First birth date: ${formatDateParts(d.first)}`,
        `Second birth date: ${formatDateParts(d.second)}`,
        `Difference: ${formatAgeFull(d.years, d.months, d.days)}`,
        `Days between: ${d.totalDays}`,
        `Older: ${same ? "both same" : d.older === "first" ? "first person" : "second person"}`,
      ].join("\n"),
    },
  };
}
