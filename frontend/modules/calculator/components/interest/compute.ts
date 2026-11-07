/**
 * Turns raw form strings into a validated ResultView via the interest engine.
 * Empty required fields keep the state "incomplete".
 */

import {
  calculateCompoundInterest,
  calculateDoublingTime,
  calculateSimpleInterest,
  compoundingLabel,
} from "../../engine/interest-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState } from "../shared/result-types";
import type { InterestForms, InterestModeId } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

/**
 * Human time label from years: 2.5 → "2 years 6 months",
 * 0.5 → "6 months", 5 → "5 years".
 */
export function formatYears(years: number): string {
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} ${m === 1 ? "month" : "months"}`;
  if (m === 0) return `${y} ${y === 1 ? "year" : "years"}`;
  return `${y} ${y === 1 ? "year" : "years"} ${m} ${m === 1 ? "month" : "months"}`;
}

/** Whole-month label from the engine's totalMonths (doubling mode). */
export function formatMonths(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} ${m === 1 ? "month" : "months"}`;
  if (m === 0) return `${y} ${y === 1 ? "year" : "years"}`;
  return `${y} ${y === 1 ? "year" : "years"} ${m} ${m === 1 ? "month" : "months"}`;
}

export function computeInterestResult(
  mode: InterestModeId,
  forms: InterestForms,
): ComputeState {
  switch (mode) {
    case "simple":
      return computeSimple(forms);
    case "compound":
      return computeCompound(forms);
    case "doubling":
      return computeDoubling(forms);
  }
}

// ── Mode A: Simple interest ──────────────────────────────────

function computeSimple(forms: InterestForms): ComputeState {
  const principal = n(forms.simple.principal);
  const rate = n(forms.simple.rate);
  const years = n(forms.simple.time);
  if (principal === null || rate === null || years === null) return incomplete();

  const r = calculateSimpleInterest({ principal, annualRate: rate, years });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const timeLabel = formatYears(d.years);

  return {
    state: "ok",
    view: {
      headlineLabel: "Maturity amount",
      headlineValue: formatCurrency(d.maturity),
      subLabel: "Simple interest",
      subValue: formatCurrency(d.interest),
      rows: [
        { label: "Principal", value: formatCurrency(d.principal) },
        { label: "Interest rate", value: `${rateLabel} p.a.` },
        { label: "Time", value: timeLabel },
        { label: "Simple interest", value: formatCurrency(d.interest) },
        { label: "Maturity amount", value: formatCurrency(d.maturity), emphasis: true },
      ],
      note: `SI = P × R × T ÷ 100 → ${formatCurrency(d.principal)} × ${rateLabel} × ${timeLabel} ÷ 100 = ${formatCurrency(d.interest)}`,
      copyText: [
        "Interest Calculator — Simple Interest",
        `Principal: ${formatCurrency(d.principal)}`,
        `Interest rate: ${rateLabel} p.a.`,
        `Time: ${timeLabel}`,
        `Simple interest: ${formatCurrency(d.interest)}`,
        `Maturity amount: ${formatCurrency(d.maturity)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: Compound interest ────────────────────────────────

function computeCompound(forms: InterestForms): ComputeState {
  const principal = n(forms.compound.principal);
  const rate = n(forms.compound.rate);
  const years = n(forms.compound.time);
  if (principal === null || rate === null || years === null) return incomplete();

  const r = calculateCompoundInterest({
    principal,
    annualRate: rate,
    years,
    periodsPerYear: forms.compound.periodsPerYear,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const timeLabel = formatYears(d.years);
  const freqLabel = compoundingLabel(d.periodsPerYear);

  return {
    state: "ok",
    view: {
      headlineLabel: "Maturity amount",
      headlineValue: formatCurrency(d.maturity),
      subLabel: "Compound interest",
      subValue: formatCurrency(d.interest),
      rows: [
        { label: "Principal", value: formatCurrency(d.principal) },
        { label: "Interest rate", value: `${rateLabel} p.a.` },
        { label: "Time", value: timeLabel },
        { label: "Compounding", value: freqLabel },
        { label: "Effective annual rate", value: formatPercentage(d.effectiveRate) },
        { label: "Compound interest", value: formatCurrency(d.interest) },
        { label: "Maturity amount", value: formatCurrency(d.maturity), emphasis: true },
      ],
      note: `A = P × (1 + r ÷ n)^(n × t) → ${formatCurrency(d.principal)} at ${rateLabel} compounded ${freqLabel.toLowerCase()} for ${timeLabel}`,
      copyText: [
        "Interest Calculator — Compound Interest",
        `Principal: ${formatCurrency(d.principal)}`,
        `Interest rate: ${rateLabel} p.a.`,
        `Time: ${timeLabel}`,
        `Compounding: ${freqLabel}`,
        `Effective annual rate: ${formatPercentage(d.effectiveRate)}`,
        `Compound interest: ${formatCurrency(d.interest)}`,
        `Maturity amount: ${formatCurrency(d.maturity)}`,
      ].join("\n"),
    },
  };
}

// ── Mode C: Doubling time ────────────────────────────────────

function computeDoubling(forms: InterestForms): ComputeState {
  const rate = n(forms.doubling.rate);
  if (rate === null) return incomplete();

  const r = calculateDoublingTime({ annualRate: rate, basis: forms.doubling.basis });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const basisLabel = compoundingLabel(d.basis);
  const simple = d.basis === "simple";

  return {
    state: "ok",
    view: {
      headlineLabel: "Time to double",
      headlineValue: `${d.years} years`,
      subLabel: "Rule of 72 estimate",
      subValue: `${d.ruleOf72} years`,
      rows: [
        { label: "Interest rate", value: `${rateLabel} p.a.` },
        { label: "Basis", value: basisLabel },
        { label: "Exact time", value: `${d.years} years` },
        { label: "Approximately", value: formatMonths(d.totalMonths) },
        { label: "Rule of 72 estimate", value: `${d.ruleOf72} years`, emphasis: true },
      ],
      note: simple
        ? `T = 100 ÷ R → 100 ÷ ${rateLabel.replace("%", "")} = ${d.years} years (simple interest)`
        : `T = ln 2 ÷ (n × ln(1 + r ÷ n)) → ${d.years} years compounded ${basisLabel.toLowerCase()} at ${rateLabel} p.a.`,
      copyText: [
        "Interest Calculator — Doubling Time",
        `Interest rate: ${rateLabel} p.a.`,
        `Basis: ${basisLabel}`,
        `Time to double: ${d.years} years (${formatMonths(d.totalMonths)})`,
        `Rule of 72 estimate: ${d.ruleOf72} years`,
      ].join("\n"),
    },
  };
}
