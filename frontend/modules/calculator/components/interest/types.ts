/**
 * Loan & Interest Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

import type { DoublingBasis, PeriodsPerYear } from "../../engine/interest-calculator";

export type InterestModeId = "simple" | "compound" | "doubling";

// ── Per-mode form state (raw input strings) ──────────────────

export interface SimpleForm {
  principal: string;
  rate: string;
  time: string;
}

export interface CompoundForm {
  principal: string;
  rate: string;
  time: string;
  periodsPerYear: PeriodsPerYear;
}

export interface DoublingForm {
  rate: string;
  basis: DoublingBasis;
}

export interface InterestForms {
  simple: SimpleForm;
  compound: CompoundForm;
  doubling: DoublingForm;
}

/** Stable initial state — rate/time pre-filled so only the amount is needed. */
export const INTEREST_INITIAL_FORMS: InterestForms = {
  simple: { principal: "", rate: "8", time: "5" },
  compound: { principal: "", rate: "8", time: "5", periodsPerYear: 2 },
  doubling: { rate: "8", basis: 1 },
};

// ── Mode metadata ────────────────────────────────────────────

export interface InterestModeMeta {
  id: InterestModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
}

export const INTEREST_MODE_META: InterestModeMeta[] = [
  { id: "simple", letter: "A", label: "Simple Interest" },
  { id: "compound", letter: "B", label: "Compound Interest" },
  { id: "doubling", letter: "C", label: "Doubling Time" },
];
