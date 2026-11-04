/**
 * Percentage Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 *
 * Every mode is a pair of numeric fields, so a single generic form shape
 * ({ first, second }) serves all ten modes — labels, placeholders, percent
 * suffixes and chip placement live in MODE_META instead of ten interfaces.
 */

export type ModeId =
  | "percentOf"
  | "whatPercent"
  | "change"
  | "difference"
  | "increase"
  | "decrease"
  | "beforeIncrease"
  | "beforeDiscount"
  | "ofWhat"
  | "combined";

/** Two raw input strings — meaning depends on the active mode. */
export interface PercentForm {
  first: string;
  second: string;
}

export type PercentForms = Record<ModeId, PercentForm>;

/** Stable initial state — no random values so SSR hydration matches. */
export const INITIAL_FORMS: PercentForms = {
  percentOf: { first: "", second: "" },
  whatPercent: { first: "", second: "" },
  change: { first: "", second: "" },
  difference: { first: "", second: "" },
  increase: { first: "", second: "" },
  decrease: { first: "", second: "" },
  beforeIncrease: { first: "", second: "" },
  beforeDiscount: { first: "", second: "" },
  ofWhat: { first: "", second: "" },
  combined: { first: "", second: "" },
};

// ── Mode metadata ────────────────────────────────────────────

export interface FieldMeta {
  label: string;
  placeholder?: string;
  /** Rendered inside the input, e.g. "%". */
  suffix?: string;
}

export interface ModeMeta {
  id: ModeId;
  /** Letter shown in the tab, per PRD mode naming (A–J). */
  letter: string;
  label: string;
  /** Short label for narrow screens. */
  shortLabel: string;
  first: FieldMeta;
  second: FieldMeta;
  /** Fields that get quick percent chips (5/10/15/20/25/50). */
  chipFields: Array<"first" | "second">;
  /** Small helper text under the fields. */
  hint?: string;
}

export const MODE_META: ModeMeta[] = [
  {
    id: "percentOf",
    letter: "A",
    label: "% of Number",
    shortLabel: "% of",
    first: { label: "Percent", suffix: "%", placeholder: "20" },
    second: { label: "Number", placeholder: "1500" },
    chipFields: ["first"],
    hint: "What is 20% of 1,500?",
  },
  {
    id: "whatPercent",
    letter: "B",
    label: "What Percent",
    shortLabel: "What %",
    first: { label: "Value", placeholder: "15" },
    second: { label: "Whole value", placeholder: "60" },
    chipFields: [],
    hint: "15 is what percent of 60?",
  },
  {
    id: "change",
    letter: "C",
    label: "% Change",
    shortLabel: "Change",
    first: { label: "From", placeholder: "200" },
    second: { label: "To", placeholder: "250" },
    chipFields: [],
    hint: "Growth or decline from one value to another — signed.",
  },
  {
    id: "difference",
    letter: "D",
    label: "% Difference",
    shortLabel: "Difference",
    first: { label: "First value", placeholder: "100" },
    second: { label: "Second value", placeholder: "150" },
    chipFields: [],
    hint: "Unsigned gap between two values, measured against their average.",
  },
  {
    id: "increase",
    letter: "E",
    label: "Increase by %",
    shortLabel: "Increase",
    first: { label: "Number", placeholder: "1500" },
    second: { label: "Percent", suffix: "%", placeholder: "20" },
    chipFields: ["second"],
    hint: "1,500 increased by 20% = 1,800.",
  },
  {
    id: "decrease",
    letter: "F",
    label: "Decrease by %",
    shortLabel: "Decrease",
    first: { label: "Number", placeholder: "1500" },
    second: { label: "Percent", suffix: "%", placeholder: "20" },
    chipFields: ["second"],
    hint: "1,500 decreased by 20% = 1,200.",
  },
  {
    id: "beforeIncrease",
    letter: "G",
    label: "Before Increase",
    shortLabel: "Before ↑",
    first: { label: "Final value", placeholder: "1800" },
    second: { label: "Percent rise", suffix: "%", placeholder: "20" },
    chipFields: ["second"],
    hint: "Reverse of E — finds the value before a percentage rise.",
  },
  {
    id: "beforeDiscount",
    letter: "H",
    label: "Before Discount",
    shortLabel: "MRP",
    first: { label: "Sale price", placeholder: "800" },
    second: { label: "Discount", suffix: "%", placeholder: "20" },
    chipFields: ["second"],
    hint: "Reverse of F — recovers the pre-sale price (MRP) from a discounted price.",
  },
  {
    id: "ofWhat",
    letter: "I",
    label: "Percent of What",
    shortLabel: "Of what",
    first: { label: "Value", placeholder: "500" },
    second: { label: "Percent", suffix: "%", placeholder: "15" },
    chipFields: ["second"],
    hint: "500 is 15% of what total?",
  },
  {
    id: "combined",
    letter: "J",
    label: "Combined %",
    shortLabel: "Combined",
    first: { label: "First change", suffix: "%", placeholder: "10" },
    second: { label: "Second change", suffix: "%", placeholder: "20" },
    chipFields: ["first", "second"],
    hint: "Two changes in a row collapse into one equivalent percent (10% then 20% = 32%).",
  },
];

// ── Result view (what ResultPanel renders) ───────────────────
// Shared across all calculator tools — see components/shared/result-types.ts.

export type {
  ResultRow,
  ResultBreakdown,
  ResultView,
  ComputeState,
} from "../shared/result-types";
