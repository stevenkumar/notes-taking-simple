/**
 * Profit & Loss Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

import type { RateBasis } from "../../engine/profit-loss-calculator";

export type ProfitLossModeId = "outcome" | "selling" | "cost";

// ── Per-mode form state (raw input strings) ──────────────────

export interface OutcomeForm {
  costPrice: string;
  sellingPrice: string;
}

export interface SellingForm {
  costPrice: string;
  rate: string;
  basis: RateBasis;
}

export interface CostForm {
  sellingPrice: string;
  rate: string;
  basis: RateBasis;
}

export interface ProfitLossForms {
  outcome: OutcomeForm;
  selling: SellingForm;
  cost: CostForm;
}

/** Stable initial state — rate pre-filled so only the amount is needed. */
export const PROFIT_LOSS_INITIAL_FORMS: ProfitLossForms = {
  outcome: { costPrice: "", sellingPrice: "" },
  selling: { costPrice: "", rate: "20", basis: "markup" },
  cost: { sellingPrice: "", rate: "20", basis: "markup" },
};

// ── Mode metadata ────────────────────────────────────────────

export interface ProfitLossModeMeta {
  id: ProfitLossModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
}

export const PROFIT_LOSS_MODE_META: ProfitLossModeMeta[] = [
  { id: "outcome", letter: "A", label: "Profit or Loss" },
  { id: "selling", letter: "B", label: "Find Selling Price" },
  { id: "cost", letter: "C", label: "Find Cost Price" },
];
