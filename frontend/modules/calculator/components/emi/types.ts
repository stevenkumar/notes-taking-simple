/**
 * EMI Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

export type EmiModeId = "emi" | "afford" | "prepay";

export type TenureUnit = "years" | "months";

// ── Per-mode form state (raw input strings) ──────────────────

export interface EmiForm {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
}

export interface AffordForm {
  monthlyEmi: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
}

export interface PrepayForm {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: TenureUnit;
  extra: string;
}

export interface EmiForms {
  emi: EmiForm;
  afford: AffordForm;
  prepay: PrepayForm;
}

/** Stable initial state — rate/tenure pre-filled so only the amount is needed. */
export const EMI_INITIAL_FORMS: EmiForms = {
  emi: { principal: "", rate: "9", tenure: "20", tenureUnit: "years" },
  afford: { monthlyEmi: "", rate: "9", tenure: "20", tenureUnit: "years" },
  prepay: { principal: "", rate: "9", tenure: "20", tenureUnit: "years", extra: "" },
};

// ── Mode metadata ────────────────────────────────────────────

export interface EmiModeMeta {
  id: EmiModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
  shortLabel: string;
}

export const EMI_MODE_META: EmiModeMeta[] = [
  { id: "emi", letter: "A", label: "Find EMI", shortLabel: "EMI" },
  { id: "afford", letter: "B", label: "Loan Amount", shortLabel: "Loan" },
  { id: "prepay", letter: "C", label: "Prepayment", shortLabel: "Prepay" },
];
