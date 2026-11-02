/**
 * Discount & Shopping Calculator – calculation engine (PRD §6.11, Modes A–H).
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14.
 *
 * Rounding policy (explicit, per PRD §14):
 *   - Money values are rounded to 2 decimal places (half-up) at each step
 *     where a price is produced. Step N always operates on the rounded
 *     price of step N−1 (retail billing behaviour).
 *   - Percentages are rounded to 2 decimal places (half-up).
 *   - discount + finalPrice always sum exactly to the original price.
 *
 * Validation: every function validates inputs and returns a discriminated
 * CalculationResult — never throws, never uses eval.
 */

import Decimal from "decimal.js";
import type {
  CalculationError,
  CalculationResult,
} from "../types";

// 40 significant digits is far beyond any real currency need.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Helpers ──────────────────────────────────────────────────

/** Convert a JS number to Decimal safely (via string to avoid float artifacts). */
function dec(value: number | string): Decimal {
  return new Decimal(typeof value === "number" ? String(value) : value);
}

/** Round to 2 decimal places, half-up. Used for all money and percent outputs. */
function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

function requirePositive(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value <= 0) return fail(`${label} must be greater than 0`, field);
  return null;
}

function requireNonNegative(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  return null;
}

/** Percentage between 0 and 100 inclusive (100% is valid → zero payable). */
function requirePercent(
  value: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (value < 0) return fail(`${label} cannot be negative`, field);
  if (value > 100) return fail(`${label} cannot exceed 100%`, field);
  return null;
}

function requireIntegerAtLeast(
  value: number,
  min: number,
  field: string,
  label: string,
): CalculationError | null {
  if (!Number.isFinite(value)) return fail(`${label} must be a valid number`, field);
  if (!Number.isInteger(value)) return fail(`${label} must be a whole number`, field);
  if (value < min) return fail(`${label} must be at least ${min}`, field);
  return null;
}

// ── Mode A: Simple percentage discount ───────────────────────

export interface SimpleDiscountInputs {
  originalPrice: number;
  discountPercent: number;
}

export interface SimpleDiscountResult {
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
}

export function calculateSimpleDiscount(
  inputs: SimpleDiscountInputs,
): CalculationResult<SimpleDiscountResult> {
  const e = requirePositive(inputs.originalPrice, "originalPrice", "Original price");
  if (e) return e;
  const e2 = requirePercent(inputs.discountPercent, "discountPercent", "Discount");
  if (e2) return e2;

  const price = dec(inputs.originalPrice);
  const discountAmount = round2(price.times(dec(inputs.discountPercent)).div(100));
  const finalPrice = round2(price.minus(discountAmount));

  return {
    ok: true,
    data: {
      originalPrice: round2(price),
      discountPercent: inputs.discountPercent,
      discountAmount,
      finalPrice,
      savings: discountAmount,
    },
  };
}

// ── Mode B: Fixed amount discount ────────────────────────────

export interface FixedDiscountInputs {
  originalPrice: number;
  discountAmount: number;
}

export interface FixedDiscountResult {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  savingsPercent: number;
}

export function calculateFixedDiscount(
  inputs: FixedDiscountInputs,
): CalculationResult<FixedDiscountResult> {
  const e = requirePositive(inputs.originalPrice, "originalPrice", "Original price");
  if (e) return e;
  const e2 = requireNonNegative(inputs.discountAmount, "discountAmount", "Discount");
  if (e2) return e2;

  const price = dec(inputs.originalPrice);
  const discount = dec(inputs.discountAmount);

  if (discount.gt(price)) {
    return fail("Discount cannot exceed the original price", "discountAmount");
  }

  // Round the discount first so discount + final always equals the original.
  const discountAmount = round2(discount);
  const finalPrice = round2(price.minus(discountAmount));
  const savingsPercent = round2(dec(discountAmount).div(price).times(100));

  return {
    ok: true,
    data: {
      originalPrice: round2(price),
      discountAmount,
      finalPrice,
      savingsPercent,
    },
  };
}

// ── Mode C: Multiple sequential discounts ────────────────────

export interface SequentialDiscountInputs {
  originalPrice: number;
  /** Each discount applies to the REMAINING price, never added together (PRD §6.11 C). */
  discountPercents: number[];
}

export interface SequentialDiscountStep {
  discountPercent: number;
  discountAmount: number;
  priceAfter: number;
}

export interface SequentialDiscountResult {
  originalPrice: number;
  steps: SequentialDiscountStep[];
  finalPrice: number;
  totalDiscountAmount: number;
  /** e.g. 20% then 10% → 28%, NOT 30%. */
  effectiveDiscountPercent: number;
}

export function calculateSequentialDiscounts(
  inputs: SequentialDiscountInputs,
): CalculationResult<SequentialDiscountResult> {
  const e = requirePositive(inputs.originalPrice, "originalPrice", "Original price");
  if (e) return e;

  if (!inputs.discountPercents.length) {
    return fail("Add at least one discount", "discountPercents");
  }

  const steps: SequentialDiscountStep[] = [];
  let current = dec(inputs.originalPrice);

  for (let i = 0; i < inputs.discountPercents.length; i++) {
    const pctValue = inputs.discountPercents[i];
    const e2 = requirePercent(pctValue, `discountPercents.${i}`, `Discount ${i + 1}`);
    if (e2) return e2;

    const discountAmount = round2(current.times(dec(pctValue)).div(100));
    const priceAfter = round2(current.minus(discountAmount));
    steps.push({ discountPercent: pctValue, discountAmount, priceAfter });
    current = dec(priceAfter);
  }

  const original = dec(inputs.originalPrice);
  const finalPrice = round2(current);
  const totalDiscountAmount = round2(original.minus(current));
  const effectiveDiscountPercent = round2(
    original.minus(current).div(original).times(100),
  );

  return {
    ok: true,
    data: {
      originalPrice: round2(original),
      steps,
      finalPrice,
      totalDiscountAmount,
      effectiveDiscountPercent,
    },
  };
}

// ── Mode D1: Buy X Get Y free ────────────────────────────────

export interface BogoInputs {
  itemPrice: number;
  buyQuantity: number;
  freeQuantity: number;
}

export interface BogoResult {
  itemPrice: number;
  purchasedQuantity: number;
  freeQuantity: number;
  totalItems: number;
  amountPayable: number;
  effectivePricePerItem: number;
  effectiveDiscountPercent: number;
}

export function calculateBogo(
  inputs: BogoInputs,
): CalculationResult<BogoResult> {
  const e = requirePositive(inputs.itemPrice, "itemPrice", "Item price");
  if (e) return e;
  const e2 = requireIntegerAtLeast(inputs.buyQuantity, 1, "buyQuantity", "Purchased quantity");
  if (e2) return e2;
  const e3 = requireIntegerAtLeast(inputs.freeQuantity, 0, "freeQuantity", "Free quantity");
  if (e3) return e3;

  const price = dec(inputs.itemPrice);
  const totalItems = inputs.buyQuantity + inputs.freeQuantity;

  const amountPayable = round2(price.times(inputs.buyQuantity));
  const effectivePricePerItem = round2(price.times(inputs.buyQuantity).div(totalItems));

  const totalValue = price.times(totalItems);
  const effectiveDiscountPercent = round2(
    totalValue.minus(amountPayable).div(totalValue).times(100),
  );

  return {
    ok: true,
    data: {
      itemPrice: round2(price),
      purchasedQuantity: inputs.buyQuantity,
      freeQuantity: inputs.freeQuantity,
      totalItems,
      amountPayable,
      effectivePricePerItem,
      effectiveDiscountPercent,
    },
  };
}

// ── Mode D2: Bundle deal (pay a fixed price for N items) ─────

export interface BundleInputs {
  itemPrice: number;
  bundleQuantity: number;
  bundlePrice: number;
}

export interface BundleResult {
  itemPrice: number;
  bundleQuantity: number;
  bundlePrice: number;
  totalItems: number;
  amountPayable: number;
  effectivePricePerItem: number;
  effectiveDiscountPercent: number;
}

export function calculateBundleDeal(
  inputs: BundleInputs,
): CalculationResult<BundleResult> {
  const e = requirePositive(inputs.itemPrice, "itemPrice", "Item price");
  if (e) return e;
  const e2 = requireIntegerAtLeast(inputs.bundleQuantity, 1, "bundleQuantity", "Bundle quantity");
  if (e2) return e2;
  const e3 = requireNonNegative(inputs.bundlePrice, "bundlePrice", "Bundle price");
  if (e3) return e3;

  const price = dec(inputs.itemPrice);
  const fullValue = price.times(inputs.bundleQuantity);
  const bundle = dec(inputs.bundlePrice);

  if (bundle.gt(fullValue)) {
    return fail(
      "Bundle price cannot exceed the total item value",
      "bundlePrice",
    );
  }

  const amountPayable = round2(bundle);
  const effectivePricePerItem = round2(bundle.div(inputs.bundleQuantity));
  const effectiveDiscountPercent = round2(
    fullValue.minus(bundle).div(fullValue).times(100),
  );

  return {
    ok: true,
    data: {
      itemPrice: round2(price),
      bundleQuantity: inputs.bundleQuantity,
      bundlePrice: amountPayable,
      totalItems: inputs.bundleQuantity,
      amountPayable,
      effectivePricePerItem,
      effectiveDiscountPercent,
    },
  };
}

// ── Mode E: Quantity-based shopping ──────────────────────────

export interface QuantityDiscountInputs {
  unitPrice: number;
  quantity: number;
  discountType: "percent" | "fixed";
  discountValue: number;
}

export interface QuantityDiscountResult {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  averagePricePerItem: number;
}

export function calculateQuantityDiscount(
  inputs: QuantityDiscountInputs,
): CalculationResult<QuantityDiscountResult> {
  const e = requirePositive(inputs.unitPrice, "unitPrice", "Unit price");
  if (e) return e;
  const e2 = requirePositive(inputs.quantity, "quantity", "Quantity");
  if (e2) return e2;

  const unit = dec(inputs.unitPrice);
  const subtotal = round2(unit.times(inputs.quantity));

  let discountAmount: number;
  if (inputs.discountType === "percent") {
    const e3 = requirePercent(inputs.discountValue, "discountValue", "Discount");
    if (e3) return e3;
    discountAmount = round2(dec(subtotal).times(dec(inputs.discountValue)).div(100));
  } else {
    const e3 = requireNonNegative(inputs.discountValue, "discountValue", "Discount");
    if (e3) return e3;
    if (inputs.discountValue > subtotal) {
      return fail("Discount cannot exceed the subtotal", "discountValue");
    }
    discountAmount = round2(dec(inputs.discountValue));
  }

  const finalAmount = round2(dec(subtotal).minus(discountAmount));
  const averagePricePerItem = round2(dec(finalAmount).div(inputs.quantity));

  return {
    ok: true,
    data: {
      unitPrice: round2(unit),
      quantity: inputs.quantity,
      subtotal,
      discountAmount,
      finalAmount,
      averagePricePerItem,
    },
  };
}

// ── Mode F: Discount before tax ──────────────────────────────

export interface TaxDiscountInputs {
  originalPrice: number;
  discountPercent: number;
  taxRate: number;
}

export interface TaxDiscountResult {
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  priceAfterDiscount: number;
  taxRate: number;
  taxAmount: number;
  finalAmount: number;
  totalSavings: number;
}

/**
 * Calculation order (PRD §6.11 F): discount is applied FIRST,
 * then tax is charged on the discounted price.
 */
export function calculateTaxAfterDiscount(
  inputs: TaxDiscountInputs,
): CalculationResult<TaxDiscountResult> {
  const e = requirePositive(inputs.originalPrice, "originalPrice", "Original price");
  if (e) return e;
  const e2 = requirePercent(inputs.discountPercent, "discountPercent", "Discount");
  if (e2) return e2;
  const e3 = requirePercent(inputs.taxRate, "taxRate", "Tax rate");
  if (e3) return e3;

  const price = dec(inputs.originalPrice);
  const discountAmount = round2(price.times(dec(inputs.discountPercent)).div(100));
  const priceAfterDiscount = round2(price.minus(discountAmount));
  const taxAmount = round2(dec(priceAfterDiscount).times(dec(inputs.taxRate)).div(100));
  const finalAmount = round2(dec(priceAfterDiscount).plus(taxAmount));

  return {
    ok: true,
    data: {
      originalPrice: round2(price),
      discountPercent: inputs.discountPercent,
      discountAmount,
      priceAfterDiscount,
      taxRate: inputs.taxRate,
      taxAmount,
      finalAmount,
      totalSavings: discountAmount,
    },
  };
}

// ── Mode G: Compare offers ───────────────────────────────────

export interface OfferInput {
  name: string;
  originalPrice: number;
  discountType: "percent" | "fixed";
  discountValue: number;
}

export interface OfferResult {
  name: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
  savingsPercent: number;
  isBest: boolean;
  /** finalPrice − bestFinalPrice (0 for the best offer). */
  differenceFromBest: number;
}

export interface CompareOffersResult {
  offers: OfferResult[];
  bestIndex: number;
  /** Highest final price − lowest final price. */
  priceGap: number;
}

export function compareOffers(
  offers: OfferInput[],
): CalculationResult<CompareOffersResult> {
  if (offers.length < 2) {
    return fail("Add at least two offers to compare", "offers");
  }

  const computed: Array<Omit<OfferResult, "isBest" | "differenceFromBest">> = [];

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    const label = offer.name.trim() || `Offer ${i + 1}`;

    const e = requirePositive(offer.originalPrice, `offers.${i}.originalPrice`, `${label}: price`);
    if (e) return e;

    const price = dec(offer.originalPrice);
    let discountAmount: number;

    if (offer.discountType === "percent") {
      const e2 = requirePercent(offer.discountValue, `offers.${i}.discountValue`, `${label}: discount`);
      if (e2) return e2;
      discountAmount = round2(price.times(dec(offer.discountValue)).div(100));
    } else {
      const e2 = requireNonNegative(offer.discountValue, `offers.${i}.discountValue`, `${label}: discount`);
      if (e2) return e2;
      if (offer.discountValue > offer.originalPrice) {
        return fail(
          `${label}: discount cannot exceed the price`,
          `offers.${i}.discountValue`,
        );
      }
      discountAmount = round2(dec(offer.discountValue));
    }

    const finalPrice = round2(price.minus(discountAmount));
    computed.push({
      name: label,
      originalPrice: round2(price),
      discountAmount,
      finalPrice,
      savings: discountAmount,
      savingsPercent: round2(dec(discountAmount).div(price).times(100)),
    });
  }

  // Best = lowest payable amount (first wins ties)
  let bestIndex = 0;
  for (let i = 1; i < computed.length; i++) {
    if (computed[i].finalPrice < computed[bestIndex].finalPrice) bestIndex = i;
  }

  const bestFinal = computed[bestIndex].finalPrice;
  const maxFinal = Math.max(...computed.map((o) => o.finalPrice));

  const resultOffers: OfferResult[] = computed.map((o, i) => ({
    ...o,
    isBest: i === bestIndex,
    differenceFromBest: round2(dec(o.finalPrice).minus(bestFinal)),
  }));

  return {
    ok: true,
    data: {
      offers: resultOffers,
      bestIndex,
      priceGap: round2(dec(maxFinal).minus(bestFinal)),
    },
  };
}

// ── Mode H: Counter bill estimator ───────────────────────────

export interface BasketItemInput {
  name: string;
  mrp: number;
  quantity: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  taxRate: number;
}

export interface BasketItemResult {
  name: string;
  mrp: number;
  quantity: number;
  lineTotal: number;
  discountAmount: number;
  priceAfterDiscount: number;
  taxAmount: number;
  payable: number;
}

export interface BasketResult {
  items: BasketItemResult[];
  totalMrp: number;
  totalDiscount: number;
  taxableAmount: number;
  estimatedTax: number;
  totalPayable: number;
  totalSavings: number;
}

/**
 * Bill order (PRD §6.11 H/F): discount applies to the line total first,
 * then optional tax is charged on the discounted amount.
 */
export function calculateBasketBill(
  items: BasketItemInput[],
): CalculationResult<BasketResult> {
  if (!items.length) {
    return fail("Add at least one product to the bill", "items");
  }

  const results: BasketItemResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.name.trim() || `Item ${i + 1}`;

    const e = requirePositive(item.mrp, `items.${i}.mrp`, `${label}: MRP`);
    if (e) return e;
    const e2 = requirePositive(item.quantity, `items.${i}.quantity`, `${label}: quantity`);
    if (e2) return e2;
    const e3 = requirePercent(item.taxRate, `items.${i}.taxRate`, `${label}: tax rate`);
    if (e3) return e3;

    const mrp = dec(item.mrp);
    const lineTotal = round2(mrp.times(item.quantity));

    let discountAmount: number;
    if (item.discountType === "percent") {
      const e4 = requirePercent(item.discountValue, `items.${i}.discountValue`, `${label}: discount`);
      if (e4) return e4;
      discountAmount = round2(dec(lineTotal).times(dec(item.discountValue)).div(100));
    } else {
      const e4 = requireNonNegative(item.discountValue, `items.${i}.discountValue`, `${label}: discount`);
      if (e4) return e4;
      if (item.discountValue > lineTotal) {
        return fail(
          `${label}: discount cannot exceed the line total`,
          `items.${i}.discountValue`,
        );
      }
      discountAmount = round2(dec(item.discountValue));
    }

    const priceAfterDiscount = round2(dec(lineTotal).minus(discountAmount));
    const taxAmount = round2(dec(priceAfterDiscount).times(dec(item.taxRate)).div(100));
    const payable = round2(dec(priceAfterDiscount).plus(taxAmount));

    results.push({
      name: label,
      mrp: round2(mrp),
      quantity: item.quantity,
      lineTotal,
      discountAmount,
      priceAfterDiscount,
      taxAmount,
      payable,
    });
  }

  const sum = (fn: (r: BasketItemResult) => number): number =>
    round2(results.reduce((acc, r) => acc.plus(dec(fn(r))), new Decimal(0)));

  const totalMrp = sum((r) => r.lineTotal);
  const totalDiscount = sum((r) => r.discountAmount);
  const taxableAmount = sum((r) => r.priceAfterDiscount);
  const estimatedTax = sum((r) => r.taxAmount);
  const totalPayable = sum((r) => r.payable);

  return {
    ok: true,
    data: {
      items: results,
      totalMrp,
      totalDiscount,
      taxableAmount,
      estimatedTax,
      totalPayable,
      totalSavings: totalDiscount,
    },
  };
}
