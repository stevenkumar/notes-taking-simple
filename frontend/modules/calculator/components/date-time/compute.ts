/**
 * Turns raw form strings into a validated ResultView via the date-time
 * engine.
 *
 * The reference day ("today") is passed in by the component (set in an
 * effect after mount — no hydration mismatch); only the countdown mode
 * needs it, and an empty value keeps that mode "incomplete" for the
 * first paint.
 */

import {
  addDays,
  calculateCountdown,
  calculateDateDifference,
  calculateWorkingDays,
} from "../../engine/date-time-calculator";
import {
  formatDateParts,
  formatAgeFull,
  formatAgeShort,
  parseDateInput,
  weekdayName,
} from "../../engine/age-calculator";
import type { ComputeState } from "../shared/result-types";
import type { DateTimeForm, DateTimeModeId } from "./types";

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeDateTimeResult(
  mode: DateTimeModeId,
  form: DateTimeForm,
  today: string,
): ComputeState {
  switch (mode) {
    case "difference":
      return computeDifference(form);
    case "add-days":
      return computeAddDays(form);
    case "working-days":
      return computeWorkingDays(form);
    case "countdown":
      return computeCountdown(form, today);
  }
}

// ── Mode A: date difference ──────────────────────────────────

function computeDifference(form: DateTimeForm): ComputeState {
  if (!form.from.trim() || !form.to.trim()) return incomplete();

  const from = parseDateInput(form.from);
  if (!from) return errorOf("Enter a valid start date (YYYY-MM-DD)");
  const to = parseDateInput(form.to);
  if (!to) return errorOf("Enter a valid end date (YYYY-MM-DD)");

  const r = calculateDateDifference({ from, to });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Duration",
      headlineValue: formatAgeShort(d.years, d.months, d.days),
      subLabel: "Total days",
      subValue: `${d.totalDays.toLocaleString("en-IN")} days`,
      rows: [
        { label: "From", value: `${formatDateParts(d.from)} (${d.fromWeekday})` },
        { label: "To", value: `${formatDateParts(d.to)} (${d.toWeekday})` },
        {
          label: "Duration",
          value: formatAgeFull(d.years, d.months, d.days),
          emphasis: true,
        },
        { label: "Total days", value: d.totalDays.toLocaleString("en-IN") },
      ],
      note: d.reversed
        ? `Inputs were in reverse order — measured from ${formatDateParts(d.earlier)} to ${formatDateParts(d.later)}: ${formatAgeFull(d.years, d.months, d.days)}.`
        : `From ${formatDateParts(d.from)} to ${formatDateParts(d.to)} — ${formatAgeFull(d.years, d.months, d.days)}.`,
      copyText: [
        "Date & Time Calculator — Date Difference",
        `From: ${formatDateParts(d.from)} (${d.fromWeekday})`,
        `To: ${formatDateParts(d.to)} (${d.toWeekday})`,
        `Duration: ${formatAgeFull(d.years, d.months, d.days)}`,
        `Total days: ${d.totalDays}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: add / subtract days ──────────────────────────────

function computeAddDays(form: DateTimeForm): ComputeState {
  if (!form.date.trim() || !form.amount.trim()) return incomplete();

  const date = parseDateInput(form.date);
  if (!date) return errorOf("Enter a valid date (YYYY-MM-DD)");

  const magnitude = Number(form.amount);
  if (!Number.isFinite(magnitude) || !Number.isInteger(magnitude) || magnitude < 0) {
    return errorOf("Enter a whole number of days (0 or more)");
  }
  const amount = form.direction === "subtract" ? -magnitude : magnitude;

  const r = addDays({ date, amount });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const sign = d.amount >= 0 ? "+" : "−";

  return {
    state: "ok",
    view: {
      headlineLabel: "Result date",
      headlineValue: formatDateParts(d.result),
      subLabel: "Falls on",
      subValue: `${d.resultWeekday}`,
      rows: [
        { label: "Start date", value: `${formatDateParts(d.start)} (${weekdayName(d.start)})` },
        { label: "Operation", value: `${sign} ${Math.abs(d.amount)} days`, emphasis: true },
        { label: "Result date", value: formatDateParts(d.result) },
        { label: "Weekday", value: d.resultWeekday },
        {
          label: "Breakdown",
          value:
            d.remainderDays === 0
              ? `${d.weeks} week${d.weeks === 1 ? "" : "s"}`
              : `${d.weeks} week${d.weeks === 1 ? "" : "s"} ${d.remainderDays} day${d.remainderDays === 1 ? "" : "s"}`,
        },
      ],
      note: `${formatDateParts(d.start)} ${sign} ${Math.abs(d.amount)} days = ${formatDateParts(d.result)} (${d.resultWeekday}).`,
      copyText: [
        "Date & Time Calculator — Add / Subtract Days",
        `Start date: ${formatDateParts(d.start)}`,
        `Operation: ${sign} ${Math.abs(d.amount)} days`,
        `Result date: ${formatDateParts(d.result)} (${d.resultWeekday})`,
      ].join("\n"),
    },
  };
}

// ── Mode C: working days ─────────────────────────────────────

function computeWorkingDays(form: DateTimeForm): ComputeState {
  if (!form.from.trim() || !form.to.trim()) return incomplete();

  const from = parseDateInput(form.from);
  if (!from) return errorOf("Enter a valid start date (YYYY-MM-DD)");
  const to = parseDateInput(form.to);
  if (!to) return errorOf("Enter a valid end date (YYYY-MM-DD)");

  const r = calculateWorkingDays({ from, to });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Working days",
      headlineValue: String(d.workingDays),
      subLabel: "Weekend days",
      subValue: String(d.weekendDays),
      rows: [
        { label: "From", value: `${formatDateParts(d.from)} (${weekdayName(d.from)})` },
        { label: "To", value: `${formatDateParts(d.to)} (${weekdayName(d.to)})` },
        { label: "Total days", value: `${d.totalDays} (both endpoints included)` },
        { label: "Working days (Mon–Fri)", value: String(d.workingDays), emphasis: true },
        { label: "Weekend days", value: String(d.weekendDays) },
      ],
      note: `Counting ${formatDateParts(d.earlier)} to ${formatDateParts(d.later)} inclusive — ${d.workingDays} working + ${d.weekendDays} weekend = ${d.totalDays} days.`,
      copyText: [
        "Date & Time Calculator — Working Days",
        `From: ${formatDateParts(d.from)}`,
        `To: ${formatDateParts(d.to)}`,
        `Working days: ${d.workingDays}`,
        `Weekend days: ${d.weekendDays}`,
        `Total days: ${d.totalDays}`,
      ].join("\n"),
    },
  };
}

// ── Mode D: countdown ─────────────────────────────────────────

function computeCountdown(form: DateTimeForm, today: string): ComputeState {
  if (!form.target.trim() || !today.trim()) return incomplete();

  const target = parseDateInput(form.target);
  if (!target) return errorOf("Enter a valid target date (YYYY-MM-DD)");
  const todayParts = parseDateInput(today);
  if (!todayParts) return errorOf("Could not read today's date");

  const r = calculateCountdown({ target, today: todayParts });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const headline = d.isToday
    ? "Today!"
    : d.isPast
      ? `${Math.abs(d.daysUntil)} days ago`
      : `in ${d.daysUntil} days`;

  return {
    state: "ok",
    view: {
      headlineLabel: "Countdown",
      headlineValue: headline,
      subLabel: "Target",
      subValue: `${formatDateParts(d.target)} (${d.targetWeekday})`,
      rows: [
        { label: "Today", value: `${formatDateParts(d.today)} (${weekdayName(d.today)})` },
        { label: "Target date", value: formatDateParts(d.target) },
        {
          label: d.isPast ? "Days since" : "Days remaining",
          value: String(Math.abs(d.daysUntil)),
          emphasis: true,
        },
        {
          label: "Duration",
          value: d.isToday
            ? "0 years 0 months 0 days"
            : formatAgeFull(d.duration.years, d.duration.months, d.duration.days),
        },
        { label: "Target weekday", value: d.targetWeekday },
      ],
      note: d.isToday
        ? `${formatDateParts(d.target)} is today — 🎉 it's happening now.`
        : d.isPast
          ? `${formatDateParts(d.target)} was ${d.targetWeekday}, ${Math.abs(d.daysUntil)} days ago.`
          : `${formatDateParts(d.target)} is ${d.targetWeekday}, ${d.daysUntil} days away (${formatAgeFull(d.duration.years, d.duration.months, d.duration.days)}).`,
      copyText: [
        "Date & Time Calculator — Countdown",
        `Today: ${formatDateParts(d.today)}`,
        `Target date: ${formatDateParts(d.target)} (${d.targetWeekday})`,
        d.isToday
          ? "The target date is today"
          : d.isPast
            ? `Passed ${Math.abs(d.daysUntil)} days ago`
            : `${d.daysUntil} days remaining`,
      ].join("\n"),
    },
  };
}
