/**
 * Turns raw form strings into a validated ResultView via the EMI engine,
 * plus the yearly amortisation schedule for the table below the result.
 * Empty required fields keep the state "incomplete".
 */

import {
  calculateAffordableLoan,
  calculateEmi,
  calculatePrepaymentImpact,
  summariseByYear,
  type YearlySummaryRow,
} from "../../engine/emi-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState, ResultRow } from "../shared/result-types";
import type { EmiForms, EmiModeId, TenureUnit } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

/** Convert the raw tenure field + unit to whole months. */
function toMonths(raw: string, unit: TenureUnit): number | null {
  const value = n(raw);
  if (value === null) return null;
  const months = unit === "years" ? Math.round(value * 12) : Math.round(value);
  return months;
}

/** Human tenure label, e.g. "20 years" / "18 months". */
export function formatTenure(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsLabel = `${years} ${years === 1 ? "year" : "years"}`;
  if (rest === 0) return yearsLabel;
  return `${yearsLabel} ${rest} ${rest === 1 ? "month" : "months"}`;
}

export interface EmiCompute {
  result: ComputeState;
  /** Yearly amortisation rows for the schedule table (null when not applicable). */
  schedule: YearlySummaryRow[] | null;
}

export function computeEmiResult(
  mode: EmiModeId,
  forms: EmiForms,
): EmiCompute {
  switch (mode) {
    case "emi":
      return computeEmi(forms);
    case "afford":
      return computeAfford(forms);
    case "prepay":
      return computePrepay(forms);
  }
}

// ── Mode A: Find EMI ─────────────────────────────────────────

function computeEmi(forms: EmiForms): EmiCompute {
  const principal = n(forms.emi.principal);
  const rate = n(forms.emi.rate);
  const months = toMonths(forms.emi.tenure, forms.emi.tenureUnit);
  if (principal === null || rate === null || months === null) {
    return { result: incomplete(), schedule: null };
  }

  const r = calculateEmi({ principal, annualRate: rate, tenureMonths: months });
  if (!r.ok) return { result: errorOf(r.error), schedule: null };

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const tenureLabel = formatTenure(d.tenureMonths);

  return {
    result: {
      state: "ok",
      view: {
        headlineLabel: "Monthly EMI",
        headlineValue: formatCurrency(d.emi),
        subLabel: "Total interest",
        subValue: formatCurrency(d.totalInterest),
        rows: [
          { label: "Loan amount", value: formatCurrency(d.principal) },
          { label: "Interest rate", value: `${rateLabel} p.a.` },
          { label: "Tenure", value: `${tenureLabel} (${d.tenureMonths} months)` },
          { label: "Total interest", value: formatCurrency(d.totalInterest) },
          { label: "Total payable", value: formatCurrency(d.totalPayment), emphasis: true },
        ],
        note: `EMI = P × r × (1+r)ⁿ ÷ ((1+r)ⁿ − 1) · ${d.tenureMonths} months at ${rateLabel} p.a.`,
        copyText: [
          "EMI Calculator — Find EMI",
          `Loan amount: ${formatCurrency(d.principal)}`,
          `Interest rate: ${rateLabel} p.a.`,
          `Tenure: ${tenureLabel} (${d.tenureMonths} months)`,
          `Monthly EMI: ${formatCurrency(d.emi)}`,
          `Total interest: ${formatCurrency(d.totalInterest)}`,
          `Total payable: ${formatCurrency(d.totalPayment)}`,
        ].join("\n"),
      },
    },
    schedule: summariseByYear(d.schedule),
  };
}

// ── Mode B: Loan amount (affordability) ──────────────────────

function computeAfford(forms: EmiForms): EmiCompute {
  const monthlyEmi = n(forms.afford.monthlyEmi);
  const rate = n(forms.afford.rate);
  const months = toMonths(forms.afford.tenure, forms.afford.tenureUnit);
  if (monthlyEmi === null || rate === null || months === null) {
    return { result: incomplete(), schedule: null };
  }

  const r = calculateAffordableLoan({
    monthlyPayment: monthlyEmi,
    annualRate: rate,
    tenureMonths: months,
  });
  if (!r.ok) return { result: errorOf(r.error), schedule: null };

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const tenureLabel = formatTenure(d.tenureMonths);

  return {
    result: {
      state: "ok",
      view: {
        headlineLabel: "Loan amount you can afford",
        headlineValue: formatCurrency(d.principal),
        subLabel: "Total interest",
        subValue: formatCurrency(d.totalInterest),
        rows: [
          { label: "Monthly EMI", value: formatCurrency(d.monthlyPayment) },
          { label: "Interest rate", value: `${rateLabel} p.a.` },
          { label: "Tenure", value: `${tenureLabel} (${d.tenureMonths} months)` },
          { label: "Total interest", value: formatCurrency(d.totalInterest) },
          { label: "Total payable", value: formatCurrency(d.totalPayment), emphasis: true },
        ],
        note: `P = EMI × ((1+r)ⁿ − 1) ÷ (r × (1+r)ⁿ) · ${d.tenureMonths} months at ${rateLabel} p.a.`,
        copyText: [
          "EMI Calculator — Loan Amount",
          `Monthly EMI: ${formatCurrency(d.monthlyPayment)}`,
          `Interest rate: ${rateLabel} p.a.`,
          `Tenure: ${tenureLabel} (${d.tenureMonths} months)`,
          `Loan amount: ${formatCurrency(d.principal)}`,
          `Total interest: ${formatCurrency(d.totalInterest)}`,
          `Total payable: ${formatCurrency(d.totalPayment)}`,
        ].join("\n"),
      },
    },
    schedule: summariseByYear(d.schedule),
  };
}

// ── Mode C: Prepayment impact ────────────────────────────────

function computePrepay(forms: EmiForms): EmiCompute {
  const principal = n(forms.prepay.principal);
  const rate = n(forms.prepay.rate);
  const months = toMonths(forms.prepay.tenure, forms.prepay.tenureUnit);
  const extra = n(forms.prepay.extra);
  if (principal === null || rate === null || months === null || extra === null) {
    return { result: incomplete(), schedule: null };
  }

  const r = calculatePrepaymentImpact({
    principal,
    annualRate: rate,
    tenureMonths: months,
    extraPayment: extra,
  });
  if (!r.ok) return { result: errorOf(r.error), schedule: null };

  const d = r.data;
  const rateLabel = formatPercentage(d.annualRate);
  const savedLabel = formatTenure(d.monthsSaved);

  const rows: ResultRow[] = [
    { label: "Original EMI", value: formatCurrency(d.emi) },
    { label: "New monthly payment", value: formatCurrency(d.newPayment), emphasis: true },
    { label: "Original tenure", value: formatTenure(d.tenureMonths) },
    { label: "New tenure", value: formatTenure(d.newTenureMonths) },
    { label: "Months saved", value: `${d.monthsSaved} (${savedLabel})` },
    { label: "Interest without prepayment", value: formatCurrency(d.totalInterest) },
    { label: "Interest with prepayment", value: formatCurrency(d.newTotalInterest) },
    { label: "Interest saved", value: formatCurrency(d.interestSaved), emphasis: true },
  ];

  return {
    result: {
      state: "ok",
      view: {
        headlineLabel: "Tenure reduced by",
        headlineValue: savedLabel,
        subLabel: "Interest saved",
        subValue: formatCurrency(d.interestSaved),
        rows,
        note: `Paying ${formatCurrency(d.extraPayment)} extra each month repays the loan in ${formatTenure(d.newTenureMonths)} instead of ${formatTenure(d.tenureMonths)} at ${rateLabel} p.a.`,
        copyText: [
          "EMI Calculator — Prepayment Impact",
          `Loan amount: ${formatCurrency(d.principal)}`,
          `Interest rate: ${rateLabel} p.a.`,
          `Original tenure: ${formatTenure(d.tenureMonths)} · EMI ${formatCurrency(d.emi)}`,
          `Extra monthly payment: ${formatCurrency(d.extraPayment)}`,
          `New tenure: ${formatTenure(d.newTenureMonths)} (${d.newTenureMonths} months)`,
          `Months saved: ${d.monthsSaved} (${savedLabel})`,
          `Interest saved: ${formatCurrency(d.interestSaved)}`,
          `New total interest: ${formatCurrency(d.newTotalInterest)}`,
        ].join("\n"),
      },
    },
    schedule: summariseByYear(d.schedule),
  };
}
