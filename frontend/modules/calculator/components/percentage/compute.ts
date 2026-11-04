/**
 * Turns raw form strings into a validated ResultView via the percentage engine.
 * Empty required fields keep the state "incomplete".
 *
 * Display convention: plain numbers (formatNumber), not currency — this tool
 * serves marks, ratios and money alike. Percents use formatPercentage.
 */

import {
  calculatePercentOf,
  findWhatPercent,
  calculatePercentChange,
  calculatePercentDifference,
  calculateIncrease,
  calculateDecrease,
  findOriginalBeforeIncrease,
  findOriginalBeforeDecrease,
  findWholeFromPercent,
  calculateSuccessiveChange,
} from "../../engine/percentage-calculator";
import { formatNumber, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState, ModeId, PercentForms } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computePercentageResult(
  mode: ModeId,
  forms: PercentForms,
): ComputeState {
  switch (mode) {
    case "percentOf":
      return computePercentOf(forms);
    case "whatPercent":
      return computeWhatPercent(forms);
    case "change":
      return computeChange(forms);
    case "difference":
      return computeDifference(forms);
    case "increase":
      return computeIncrease(forms);
    case "decrease":
      return computeDecrease(forms);
    case "beforeIncrease":
      return computeBeforeIncrease(forms);
    case "beforeDiscount":
      return computeBeforeDiscount(forms);
    case "ofWhat":
      return computeOfWhat(forms);
    case "combined":
      return computeCombined(forms);
  }
}

/** Parse both fields of a mode; null → incomplete. */
function pair(
  form: { first: string; second: string },
): [number, number] | null {
  const first = n(form.first);
  const second = n(form.second);
  if (first === null || second === null) return null;
  return [first, second];
}

// ── Mode A ───────────────────────────────────────────────────

function computePercentOf(forms: PercentForms): ComputeState {
  const parsed = pair(forms.percentOf);
  if (!parsed) return incomplete();
  const [percent, value] = parsed;

  const r = calculatePercentOf({ percent, value });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Result",
      headlineValue: formatNumber(d.result),
      rows: [
        { label: "Percent", value: formatPercentage(d.percent) },
        { label: "Number", value: formatNumber(d.value) },
      ],
      note: `${formatNumber(d.value)} × ${formatPercentage(d.percent)} = ${formatNumber(d.result)}`,
      copyText: [
        "Percentage Calculator — Percent of Number",
        `${formatPercentage(d.percent)} of ${formatNumber(d.value)} = ${formatNumber(d.result)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B ───────────────────────────────────────────────────

function computeWhatPercent(forms: PercentForms): ComputeState {
  const parsed = pair(forms.whatPercent);
  if (!parsed) return incomplete();
  const [part, whole] = parsed;

  const r = findWhatPercent({ part, whole });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Percentage",
      headlineValue: formatPercentage(d.percent),
      rows: [
        { label: "Value", value: formatNumber(d.part) },
        { label: "Whole value", value: formatNumber(d.whole) },
      ],
      note: `${formatNumber(d.part)} ÷ ${formatNumber(d.whole)} × 100 = ${formatPercentage(d.percent)}`,
      copyText: [
        "Percentage Calculator — What Percent",
        `${formatNumber(d.part)} is ${formatPercentage(d.percent)} of ${formatNumber(d.whole)}`,
      ].join("\n"),
    },
  };
}

// ── Mode C ───────────────────────────────────────────────────

function computeChange(forms: PercentForms): ComputeState {
  const parsed = pair(forms.change);
  if (!parsed) return incomplete();
  const [from, to] = parsed;

  const r = calculatePercentChange({ from, to });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const directionLabel =
    d.direction === "increase" ? "Increase" : d.direction === "decrease" ? "Decrease" : "No change";

  return {
    state: "ok",
    view: {
      headlineLabel: "Change",
      headlineValue: formatPercentage(d.percent),
      subLabel: "Difference",
      subValue: formatNumber(d.difference),
      rows: [
        { label: "From", value: formatNumber(d.from) },
        { label: "To", value: formatNumber(d.to) },
        { label: "Direction", value: directionLabel, emphasis: true },
      ],
      note: `${formatNumber(d.from)} → ${formatNumber(d.to)}: ${directionLabel.toLowerCase()} of ${formatPercentage(Math.abs(d.percent))}.`,
      copyText: [
        "Percentage Calculator — Percent Change",
        `From: ${formatNumber(d.from)}`,
        `To: ${formatNumber(d.to)}`,
        `Change: ${formatPercentage(d.percent)} (${directionLabel})`,
        `Difference: ${formatNumber(d.difference)}`,
      ].join("\n"),
    },
  };
}

// ── Mode D ───────────────────────────────────────────────────

function computeDifference(forms: PercentForms): ComputeState {
  const parsed = pair(forms.difference);
  if (!parsed) return incomplete();
  const [valueA, valueB] = parsed;

  const r = calculatePercentDifference({ valueA, valueB });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Difference",
      headlineValue: formatPercentage(d.percent),
      subLabel: "Absolute gap",
      subValue: formatNumber(d.difference),
      rows: [
        { label: "First value", value: formatNumber(d.valueA) },
        { label: "Second value", value: formatNumber(d.valueB) },
        { label: "Average (baseline)", value: formatNumber(d.average), emphasis: true },
      ],
      note: `|${formatNumber(d.valueA)} − ${formatNumber(d.valueB)}| ÷ ${formatNumber(d.average)} = ${formatPercentage(d.percent)} — measured against the average.`,
      copyText: [
        "Percentage Calculator — Percent Difference",
        `First value: ${formatNumber(d.valueA)}`,
        `Second value: ${formatNumber(d.valueB)}`,
        `Absolute gap: ${formatNumber(d.difference)}`,
        `Difference: ${formatPercentage(d.percent)} of the average`,
      ].join("\n"),
    },
  };
}

// ── Mode E ───────────────────────────────────────────────────

function computeIncrease(forms: PercentForms): ComputeState {
  const parsed = pair(forms.increase);
  if (!parsed) return incomplete();
  const [value, percent] = parsed;

  const r = calculateIncrease({ value, percent });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "New value",
      headlineValue: formatNumber(d.result),
      subLabel: "Increase",
      subValue: formatNumber(d.increase),
      rows: [
        { label: "Number", value: formatNumber(d.value) },
        { label: "Percent", value: formatPercentage(d.percent) },
      ],
      note: `${formatNumber(d.value)} + ${formatNumber(d.value)} × ${formatPercentage(d.percent)} = ${formatNumber(d.result)}`,
      copyText: [
        "Percentage Calculator — Increase by Percent",
        `Number: ${formatNumber(d.value)}`,
        `Increase: ${formatPercentage(d.percent)} (+${formatNumber(d.increase)})`,
        `New value: ${formatNumber(d.result)}`,
      ].join("\n"),
    },
  };
}

// ── Mode F ───────────────────────────────────────────────────

function computeDecrease(forms: PercentForms): ComputeState {
  const parsed = pair(forms.decrease);
  if (!parsed) return incomplete();
  const [value, percent] = parsed;

  const r = calculateDecrease({ value, percent });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "New value",
      headlineValue: formatNumber(d.result),
      subLabel: "Decrease",
      subValue: formatNumber(d.decrease),
      rows: [
        { label: "Number", value: formatNumber(d.value) },
        { label: "Percent", value: formatPercentage(d.percent) },
      ],
      note: `${formatNumber(d.value)} − ${formatNumber(d.value)} × ${formatPercentage(d.percent)} = ${formatNumber(d.result)}`,
      copyText: [
        "Percentage Calculator — Decrease by Percent",
        `Number: ${formatNumber(d.value)}`,
        `Decrease: ${formatPercentage(d.percent)} (−${formatNumber(d.decrease)})`,
        `New value: ${formatNumber(d.result)}`,
      ].join("\n"),
    },
  };
}

// ── Mode G ───────────────────────────────────────────────────

function computeBeforeIncrease(forms: PercentForms): ComputeState {
  const parsed = pair(forms.beforeIncrease);
  if (!parsed) return incomplete();
  const [final, percent] = parsed;

  const r = findOriginalBeforeIncrease({ final, percent });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Original value",
      headlineValue: formatNumber(d.original),
      subLabel: "Increase",
      subValue: formatNumber(d.increase),
      rows: [
        { label: "Final value", value: formatNumber(d.final) },
        { label: "Percent rise", value: formatPercentage(d.percent) },
      ],
      note: `${formatNumber(d.final)} ÷ (1 + ${formatPercentage(d.percent)}) = ${formatNumber(d.original)} — the value before the rise.`,
      copyText: [
        "Percentage Calculator — Before Increase",
        `Final value: ${formatNumber(d.final)} (after ${formatPercentage(d.percent)} rise)`,
        `Original value: ${formatNumber(d.original)}`,
        `Increase: ${formatNumber(d.increase)}`,
      ].join("\n"),
    },
  };
}

// ── Mode H ───────────────────────────────────────────────────

function computeBeforeDiscount(forms: PercentForms): ComputeState {
  const parsed = pair(forms.beforeDiscount);
  if (!parsed) return incomplete();
  const [final, percent] = parsed;

  const r = findOriginalBeforeDecrease({ final, percent });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Original price",
      headlineValue: formatNumber(d.original),
      subLabel: "Discount",
      subValue: formatNumber(d.decrease),
      rows: [
        { label: "Sale price", value: formatNumber(d.final) },
        { label: "Discount", value: formatPercentage(d.percent) },
      ],
      note: `${formatNumber(d.final)} ÷ (1 − ${formatPercentage(d.percent)}) = ${formatNumber(d.original)} — the price before the discount (MRP).`,
      copyText: [
        "Percentage Calculator — Before Discount",
        `Sale price: ${formatNumber(d.final)} (${formatPercentage(d.percent)} off)`,
        `Original price (MRP): ${formatNumber(d.original)}`,
        `Discount amount: ${formatNumber(d.decrease)}`,
      ].join("\n"),
    },
  };
}

// ── Mode I ───────────────────────────────────────────────────

function computeOfWhat(forms: PercentForms): ComputeState {
  const parsed = pair(forms.ofWhat);
  if (!parsed) return incomplete();
  const [part, percent] = parsed;

  const r = findWholeFromPercent({ part, percent });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Total value",
      headlineValue: formatNumber(d.whole),
      rows: [
        { label: "Value", value: formatNumber(d.part) },
        { label: "Percent", value: formatPercentage(d.percent) },
      ],
      note: `${formatNumber(d.part)} ÷ ${formatPercentage(d.percent)} = ${formatNumber(d.whole)}`,
      copyText: [
        "Percentage Calculator — Percent of What",
        `${formatNumber(d.part)} is ${formatPercentage(d.percent)} of ${formatNumber(d.whole)}`,
      ].join("\n"),
    },
  };
}

// ── Mode J ───────────────────────────────────────────────────

function computeCombined(forms: PercentForms): ComputeState {
  const parsed = pair(forms.combined);
  if (!parsed) return incomplete();
  const [first, second] = parsed;

  const r = calculateSuccessiveChange({ first, second });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Net change",
      headlineValue: formatPercentage(d.netPercent),
      subLabel: "Combined multiplier",
      subValue: `× ${formatNumber(d.multiplier)}`,
      rows: [
        { label: "First change", value: formatPercentage(d.first) },
        { label: "Second change", value: formatPercentage(d.second) },
        { label: "Combined factor", value: `× ${formatNumber(d.multiplier)}`, emphasis: true },
      ],
      note: `${formatPercentage(d.first)} then ${formatPercentage(d.second)} equals a single ${formatPercentage(d.netPercent)} change — percentages compound, they do not add.`,
      copyText: [
        "Percentage Calculator — Combined Percent",
        `First change: ${formatPercentage(d.first)}`,
        `Second change: ${formatPercentage(d.second)}`,
        `Net change: ${formatPercentage(d.netPercent)}`,
        `Combined multiplier: × ${formatNumber(d.multiplier)}`,
      ].join("\n"),
    },
  };
}
