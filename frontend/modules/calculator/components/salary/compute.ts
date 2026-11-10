/**
 * Turns raw form strings into a validated ResultView via the salary engine.
 * Empty required fields keep the state "incomplete".
 */

import {
  calculateSalaryFromCtc,
  calculateSalaryFromGross,
} from "../../engine/salary-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState } from "../shared/result-types";
import type { SalaryForms, SalaryModeId } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeSalaryResult(
  mode: SalaryModeId,
  forms: SalaryForms,
): ComputeState {
  return mode === "ctc" ? computeCtc(forms) : computeGross(forms);
}

// ── Mode A: CTC → Take-home ──────────────────────────────────

function computeCtc(forms: SalaryForms): ComputeState {
  const ctc = n(forms.ctc.annualCtc);
  const basic = n(forms.ctc.basicPercent);
  const pf = n(forms.ctc.pfPercent);
  const pt = n(forms.ctc.professionalTax);
  const other = n(forms.ctc.otherDeductions);
  if (ctc === null || basic === null || pf === null || pt === null || other === null) {
    return incomplete();
  }

  const r = calculateSalaryFromCtc({
    annualCtc: ctc,
    basicPercent: basic,
    pfPercent: pf,
    professionalTaxMonthly: pt,
    otherDeductionsMonthly: other,
  });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Monthly take-home",
      headlineValue: formatCurrency(d.monthlyInHand),
      subLabel: "Annual take-home",
      subValue: formatCurrency(d.inHandAnnual),
      rows: [
        { label: "Annual CTC", value: formatCurrency(d.annualCtc) },
        { label: "Basic salary (annual)", value: formatCurrency(d.annualBasic) },
        { label: "Employer PF (annual)", value: formatCurrency(d.employerPfAnnual) },
        { label: "Gross salary (annual)", value: formatCurrency(d.grossAnnual) },
        { label: "Employee PF (annual)", value: formatCurrency(d.employeePfAnnual) },
        { label: "Professional tax (annual)", value: formatCurrency(d.ptAnnual) },
        { label: "Other deductions (annual)", value: formatCurrency(d.otherAnnual) },
        {
          label: "Total deductions (annual)",
          value: formatCurrency(d.totalDeductionsAnnual),
        },
        {
          label: "Monthly take-home",
          value: formatCurrency(d.monthlyInHand),
          emphasis: true,
        },
        { label: "Deduction % of CTC", value: formatPercentage(d.deductionPercent) },
      ],
      note: `Gross = CTC − employer PF → ${formatCurrency(d.annualCtc)} − ${formatCurrency(d.employerPfAnnual)} = ${formatCurrency(d.grossAnnual)}; take-home = gross − employee PF, professional tax and other deductions`,
      copyText: [
        "Salary Calculator — CTC to Take-home",
        `Annual CTC: ${formatCurrency(d.annualCtc)}`,
        `Basic salary (annual): ${formatCurrency(d.annualBasic)}`,
        `Employer PF (annual): ${formatCurrency(d.employerPfAnnual)}`,
        `Gross salary (annual): ${formatCurrency(d.grossAnnual)}`,
        `Employee PF (annual): ${formatCurrency(d.employeePfAnnual)}`,
        `Professional tax (annual): ${formatCurrency(d.ptAnnual)}`,
        `Other deductions (annual): ${formatCurrency(d.otherAnnual)}`,
        `Total deductions (annual): ${formatCurrency(d.totalDeductionsAnnual)}`,
        `Monthly take-home: ${formatCurrency(d.monthlyInHand)}`,
        `Annual take-home: ${formatCurrency(d.inHandAnnual)}`,
        `Deduction % of CTC: ${formatPercentage(d.deductionPercent)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: Monthly gross → Take-home ────────────────────────

function computeGross(forms: SalaryForms): ComputeState {
  const gross = n(forms.gross.monthlyGross);
  const basic = n(forms.gross.basicPercent);
  const pf = n(forms.gross.pfPercent);
  const pt = n(forms.gross.professionalTax);
  const other = n(forms.gross.otherDeductions);
  if (gross === null || basic === null || pf === null || pt === null || other === null) {
    return incomplete();
  }

  const r = calculateSalaryFromGross({
    monthlyGross: gross,
    basicPercent: basic,
    pfPercent: pf,
    professionalTaxMonthly: pt,
    otherDeductionsMonthly: other,
  });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Monthly take-home",
      headlineValue: formatCurrency(d.monthlyInHand),
      subLabel: "Annual take-home",
      subValue: formatCurrency(d.annualInHand),
      rows: [
        { label: "Monthly gross", value: formatCurrency(d.monthlyGross) },
        { label: "Basic salary (monthly)", value: formatCurrency(d.monthlyBasic) },
        { label: "Employee PF (monthly)", value: formatCurrency(d.employeePfMonthly) },
        { label: "Professional tax (monthly)", value: formatCurrency(d.professionalTaxMonthly) },
        { label: "Other deductions (monthly)", value: formatCurrency(d.otherDeductionsMonthly) },
        {
          label: "Total deductions (monthly)",
          value: formatCurrency(d.totalDeductionsMonthly),
        },
        {
          label: "Monthly take-home",
          value: formatCurrency(d.monthlyInHand),
          emphasis: true,
        },
        { label: "Annual gross", value: formatCurrency(d.annualGross) },
        { label: "Annual take-home", value: formatCurrency(d.annualInHand) },
        {
          label: "Deduction % of gross",
          value: formatPercentage(d.deductionPercent),
        },
      ],
      note: `Take-home = gross − employee PF, professional tax and other deductions → ${formatCurrency(d.monthlyGross)} − ${formatCurrency(d.totalDeductionsMonthly)} = ${formatCurrency(d.monthlyInHand)} per month`,
      copyText: [
        "Salary Calculator — Monthly Gross to Take-home",
        `Monthly gross: ${formatCurrency(d.monthlyGross)}`,
        `Basic salary (monthly): ${formatCurrency(d.monthlyBasic)}`,
        `Employee PF (monthly): ${formatCurrency(d.employeePfMonthly)}`,
        `Professional tax (monthly): ${formatCurrency(d.professionalTaxMonthly)}`,
        `Other deductions (monthly): ${formatCurrency(d.otherDeductionsMonthly)}`,
        `Total deductions (monthly): ${formatCurrency(d.totalDeductionsMonthly)}`,
        `Monthly take-home: ${formatCurrency(d.monthlyInHand)}`,
        `Annual take-home: ${formatCurrency(d.annualInHand)}`,
        `Deduction % of gross: ${formatPercentage(d.deductionPercent)}`,
      ].join("\n"),
    },
  };
}
