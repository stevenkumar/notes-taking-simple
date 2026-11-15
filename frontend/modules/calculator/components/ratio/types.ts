/**
 * Ratio & Proportion Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

export type RatioModeId = "simplify" | "proportion" | "divide";

// ── Per-mode form state (raw input strings) ──────────────────

export interface SimplifyForm {
  firstTerm: string;
  secondTerm: string;
}

export interface ProportionForm {
  firstTerm: string;
  secondTerm: string;
  thirdTerm: string;
}

export interface DivideForm {
  amount: string;
  firstTerm: string;
  secondTerm: string;
}

export interface RatioForms {
  simplify: SimplifyForm;
  proportion: ProportionForm;
  divide: DivideForm;
}

/**
 * Stable initial state — the proportion is pre-filled (2 : 3 = 4 : ?)
 * so the first tab greets with a live answer, while the modes that
 * need a user amount start empty.
 */
export const RATIO_INITIAL_FORMS: RatioForms = {
  simplify: { firstTerm: "", secondTerm: "" },
  proportion: { firstTerm: "2", secondTerm: "3", thirdTerm: "4" },
  divide: { amount: "", firstTerm: "1", secondTerm: "1" },
};

// ── Mode metadata ────────────────────────────────────────────

export interface RatioModeMeta {
  id: RatioModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
}

export const RATIO_MODE_META: RatioModeMeta[] = [
  { id: "simplify", letter: "A", label: "Simplify Ratio" },
  { id: "proportion", letter: "B", label: "Solve Proportion" },
  { id: "divide", letter: "C", label: "Divide in Ratio" },
];
