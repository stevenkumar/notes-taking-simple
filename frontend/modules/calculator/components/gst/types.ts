/**
 * GST Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

import type { SupplyType } from "../../engine/gst-calculator";

export type GstModeId = "add" | "remove" | "findRate";

// ── Per-mode form state (raw input strings) ──────────────────

export interface AddForm {
  amount: string;
  rate: string;
  supplyType: SupplyType;
}

export interface RemoveForm {
  amount: string;
  rate: string;
  supplyType: SupplyType;
}

export interface FindRateForm {
  baseAmount: string;
  totalAmount: string;
}

export interface GstForms {
  add: AddForm;
  remove: RemoveForm;
  findRate: FindRateForm;
}

/** Stable initial state — defaults to the common intra-state case. */
export const GST_INITIAL_FORMS: GstForms = {
  add: { amount: "", rate: "18", supplyType: "intra" },
  remove: { amount: "", rate: "18", supplyType: "intra" },
  findRate: { baseAmount: "", totalAmount: "" },
};

// ── Mode metadata ────────────────────────────────────────────

export interface GstModeMeta {
  id: GstModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
  shortLabel: string;
}

export const GST_MODE_META: GstModeMeta[] = [
  { id: "add", letter: "A", label: "Add GST", shortLabel: "Add" },
  { id: "remove", letter: "B", label: "Remove GST", shortLabel: "Remove" },
  { id: "findRate", letter: "C", label: "Find GST Rate", shortLabel: "Rate" },
];
