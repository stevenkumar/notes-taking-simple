/**
 * Salary Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

import { SALARY_DEFAULTS } from "../../engine/salary-calculator";

export type SalaryModeId = "ctc" | "gross";

// ── Per-mode form state (raw input strings) ──────────────────

export interface SalaryCtcForm {
  annualCtc: string;
  basicPercent: string;
  pfPercent: string;
  professionalTax: string;
  otherDeductions: string;
}

export interface SalaryGrossForm {
  monthlyGross: string;
  basicPercent: string;
  pfPercent: string;
  professionalTax: string;
  otherDeductions: string;
}

export interface SalaryForms {
  ctc: SalaryCtcForm;
  gross: SalaryGrossForm;
}

/** Stable initial state — percentages and tax pre-filled, only salary is needed. */
export const SALARY_INITIAL_FORMS: SalaryForms = {
  ctc: {
    annualCtc: "",
    basicPercent: String(SALARY_DEFAULTS.basicPercent),
    pfPercent: String(SALARY_DEFAULTS.pfPercent),
    professionalTax: String(SALARY_DEFAULTS.professionalTaxMonthly),
    otherDeductions: String(SALARY_DEFAULTS.otherDeductionsMonthly),
  },
  gross: {
    monthlyGross: "",
    basicPercent: String(SALARY_DEFAULTS.basicPercent),
    pfPercent: String(SALARY_DEFAULTS.pfPercent),
    professionalTax: String(SALARY_DEFAULTS.professionalTaxMonthly),
    otherDeductions: String(SALARY_DEFAULTS.otherDeductionsMonthly),
  },
};

// ── Mode metadata ────────────────────────────────────────────

export interface SalaryModeMeta {
  id: SalaryModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
}

export const SALARY_MODE_META: SalaryModeMeta[] = [
  { id: "ctc", letter: "A", label: "CTC to Take-home" },
  { id: "gross", letter: "B", label: "Monthly Gross to Take-home" },
];
