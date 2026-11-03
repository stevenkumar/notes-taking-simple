/**
 * Discount & Shopping Calculator — form state and result view contracts.
 * Forms hold raw strings (controlled inputs); compute.ts parses and validates.
 */

export type ModeId =
  | "simple"
  | "fixed"
  | "multiple"
  | "bogo"
  | "quantity"
  | "tax"
  | "compare"
  | "basket";

export type DiscountType = "percent" | "fixed";

// ── Per-mode form state (raw input strings) ──────────────────

export interface SimpleForm {
  price: string;
  percent: string;
}

export interface FixedForm {
  price: string;
  amount: string;
}

export interface MultipleForm {
  price: string;
  percents: string[];
}

export interface BogoForm {
  kind: "bogo" | "bundle";
  price: string;
  buy: string;
  free: string;
  bundleQty: string;
  bundlePrice: string;
}

export interface QuantityForm {
  unitPrice: string;
  qty: string;
  discountType: DiscountType;
  discountValue: string;
}

export interface TaxForm {
  price: string;
  discountPercent: string;
  taxRate: string;
}

export interface OfferForm {
  id: string;
  name: string;
  price: string;
  discountType: DiscountType;
  discountValue: string;
}

export interface CompareForm {
  offers: OfferForm[];
}

export interface BasketItemForm {
  id: string;
  name: string;
  mrp: string;
  qty: string;
  discountType: DiscountType;
  discountValue: string;
  taxRate: string;
}

export interface BasketForm {
  items: BasketItemForm[];
}

export interface DiscountForms {
  simple: SimpleForm;
  fixed: FixedForm;
  multiple: MultipleForm;
  bogo: BogoForm;
  quantity: QuantityForm;
  tax: TaxForm;
  compare: CompareForm;
  basket: BasketForm;
}

/** Stable initial state — no random IDs so SSR hydration matches. */
export const INITIAL_FORMS: DiscountForms = {
  simple: { price: "", percent: "" },
  fixed: { price: "", amount: "" },
  multiple: { price: "", percents: ["", ""] },
  bogo: { kind: "bogo", price: "", buy: "2", free: "1", bundleQty: "3", bundlePrice: "" },
  quantity: { unitPrice: "", qty: "1", discountType: "percent", discountValue: "" },
  tax: { price: "", discountPercent: "", taxRate: "" },
  compare: {
    offers: [
      { id: "offer-1", name: "Offer 1", price: "", discountType: "percent", discountValue: "" },
      { id: "offer-2", name: "Offer 2", price: "", discountType: "percent", discountValue: "" },
    ],
  },
  basket: {
    items: [
      { id: "item-1", name: "", mrp: "", qty: "1", discountType: "percent", discountValue: "", taxRate: "" },
    ],
  },
};

/** Generate a stable-enough unique id for rows added after mount (client-only). */
export function newRowId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Result view (what ResultPanel renders) ───────────────────
// Shared across all calculator tools — see components/shared/result-types.ts.

export type {
  ResultRow,
  ResultBreakdown,
  ResultView,
  ComputeState,
} from "../shared/result-types";

// ── Mode metadata ────────────────────────────────────────────

export interface ModeMeta {
  id: ModeId;
  /** Letter shown in the tab, per PRD mode naming (A–H). */
  letter: string;
  label: string;
  /** Short label for narrow screens. */
  shortLabel: string;
}

export const MODE_META: ModeMeta[] = [
  { id: "simple", letter: "A", label: "Simple % Discount", shortLabel: "Simple" },
  { id: "fixed", letter: "B", label: "Fixed Amount", shortLabel: "Fixed" },
  { id: "multiple", letter: "C", label: "Multiple Discounts", shortLabel: "Multiple" },
  { id: "bogo", letter: "D", label: "BOGO / Buy X Get Y", shortLabel: "BOGO" },
  { id: "quantity", letter: "E", label: "Quantity Deal", shortLabel: "Quantity" },
  { id: "tax", letter: "F", label: "Tax + Discount", shortLabel: "Tax" },
  { id: "compare", letter: "G", label: "Compare Offers", shortLabel: "Compare" },
  { id: "basket", letter: "H", label: "Counter Bill", shortLabel: "Bill" },
];
