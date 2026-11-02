/**
 * Turns raw form strings into a validated ResultView via the calculation engine.
 * Empty optional fields (discount in E/F, tax rates) default to 0;
 * every other field must be present or the state stays "incomplete".
 */

import {
  calculateSimpleDiscount,
  calculateFixedDiscount,
  calculateSequentialDiscounts,
  calculateBogo,
  calculateBundleDeal,
  calculateQuantityDiscount,
  calculateTaxAfterDiscount,
  compareOffers,
  calculateBasketBill,
} from "../../engine/discount-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState, DiscountForms, ModeId, ResultRow } from "./types";

const n = parseNumericInput;

/** Optional numeric field: empty → 0, invalid text → null (incomplete). */
function optionalNum(raw: string): number | null {
  if (raw.trim() === "") return 0;
  return n(raw);
}

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeDiscountResult(
  mode: ModeId,
  forms: DiscountForms,
): ComputeState {
  switch (mode) {
    case "simple":
      return computeSimple(forms);
    case "fixed":
      return computeFixed(forms);
    case "multiple":
      return computeMultiple(forms);
    case "bogo":
      return computeBogo(forms);
    case "quantity":
      return computeQuantity(forms);
    case "tax":
      return computeTax(forms);
    case "compare":
      return computeCompare(forms);
    case "basket":
      return computeBasket(forms);
  }
}

// ── Mode A ───────────────────────────────────────────────────

function computeSimple(forms: DiscountForms): ComputeState {
  const price = n(forms.simple.price);
  const percent = n(forms.simple.percent);
  if (price === null || percent === null) return incomplete();

  const r = calculateSimpleDiscount({ originalPrice: price, discountPercent: percent });
  if (!r.ok) return errorOf(r.error);

  const { originalPrice, discountPercent, discountAmount, finalPrice, savings } = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "You Pay",
      headlineValue: formatCurrency(finalPrice),
      subLabel: "You Save",
      subValue: formatCurrency(savings),
      rows: [
        { label: "Original price", value: formatCurrency(originalPrice) },
        {
          label: `Discount (${formatPercentage(discountPercent)})`,
          value: `− ${formatCurrency(discountAmount)}`,
        },
      ],
      note: `${formatCurrency(originalPrice)} × ${formatPercentage(discountPercent)} = ${formatCurrency(discountAmount)}`,
      copyText: [
        "Discount Calculator — Simple % Discount",
        `Original price: ${formatCurrency(originalPrice)}`,
        `Discount: ${formatPercentage(discountPercent)}`,
        `You pay: ${formatCurrency(finalPrice)}`,
        `You save: ${formatCurrency(savings)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B ───────────────────────────────────────────────────

function computeFixed(forms: DiscountForms): ComputeState {
  const price = n(forms.fixed.price);
  const amount = n(forms.fixed.amount);
  if (price === null || amount === null) return incomplete();

  const r = calculateFixedDiscount({ originalPrice: price, discountAmount: amount });
  if (!r.ok) return errorOf(r.error);

  const { originalPrice, discountAmount, finalPrice, savingsPercent } = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "You Pay",
      headlineValue: formatCurrency(finalPrice),
      subLabel: "You Save",
      subValue: `${formatCurrency(discountAmount)} (${formatPercentage(savingsPercent)})`,
      rows: [
        { label: "Original price", value: formatCurrency(originalPrice) },
        { label: "Flat discount", value: `− ${formatCurrency(discountAmount)}` },
      ],
      note: `${formatCurrency(originalPrice)} − ${formatCurrency(discountAmount)} = ${formatCurrency(finalPrice)}`,
      copyText: [
        "Discount Calculator — Fixed Amount Discount",
        `Original price: ${formatCurrency(originalPrice)}`,
        `Discount: ${formatCurrency(discountAmount)} (${formatPercentage(savingsPercent)})`,
        `You pay: ${formatCurrency(finalPrice)}`,
      ].join("\n"),
    },
  };
}

// ── Mode C ───────────────────────────────────────────────────

function computeMultiple(forms: DiscountForms): ComputeState {
  const price = n(forms.multiple.price);
  if (price === null) return incomplete();

  const percents: number[] = [];
  for (const raw of forms.multiple.percents) {
    const v = n(raw);
    if (v === null) return incomplete();
    percents.push(v);
  }

  const r = calculateSequentialDiscounts({ originalPrice: price, discountPercents: percents });
  if (!r.ok) return errorOf(r.error);

  const { originalPrice, steps, finalPrice, totalDiscountAmount, effectiveDiscountPercent } = r.data;

  const stepRows: ResultRow[] = steps.map((s, i) => ({
    label: `After step ${i + 1} (${formatPercentage(s.discountPercent)})`,
    value: formatCurrency(s.priceAfter),
  }));

  const copyLines = [
    "Discount Calculator — Multiple Discounts",
    `Original price: ${formatCurrency(originalPrice)}`,
    ...steps.map((s, i) => `Step ${i + 1} (${formatPercentage(s.discountPercent)}): − ${formatCurrency(s.discountAmount)} → ${formatCurrency(s.priceAfter)}`),
    `Total discount: ${formatCurrency(totalDiscountAmount)} (${formatPercentage(effectiveDiscountPercent)} effective)`,
    `You pay: ${formatCurrency(finalPrice)}`,
  ];

  return {
    state: "ok",
    view: {
      headlineLabel: "You Pay",
      headlineValue: formatCurrency(finalPrice),
      subLabel: "Effective Discount",
      subValue: formatPercentage(effectiveDiscountPercent),
      rows: [
        { label: "Original price", value: formatCurrency(originalPrice) },
        { label: "Total saved", value: `− ${formatCurrency(totalDiscountAmount)}`, emphasis: true },
      ],
      breakdown: { title: "Step-by-step", rows: stepRows },
      note: `Discounts apply to the remaining price — ${formatPercentage(effectiveDiscountPercent)} effective, not ${formatPercentage(percents.reduce((a, b) => a + b, 0))}.`,
      copyText: copyLines.join("\n"),
    },
  };
}

// ── Mode D ───────────────────────────────────────────────────

function computeBogo(forms: DiscountForms): ComputeState {
  const price = n(forms.bogo.price);
  if (price === null) return incomplete();

  if (forms.bogo.kind === "bogo") {
    const buy = n(forms.bogo.buy);
    const free = n(forms.bogo.free);
    if (buy === null || free === null) return incomplete();

    const r = calculateBogo({ itemPrice: price, buyQuantity: buy, freeQuantity: free });
    if (!r.ok) return errorOf(r.error);

    const d = r.data;
    const fullValue = d.itemPrice * d.totalItems;
    return {
      state: "ok",
      view: {
        headlineLabel: "Amount Payable",
        headlineValue: formatCurrency(d.amountPayable),
        subLabel: "Effective Discount",
        subValue: formatPercentage(d.effectiveDiscountPercent),
        rows: [
          { label: `Item price`, value: formatCurrency(d.itemPrice) },
          { label: `Buy ${d.purchasedQuantity} + Get ${d.freeQuantity} free`, value: `${d.totalItems} items` },
          { label: "Total value", value: formatCurrency(fullValue) },
          { label: "Effective price per item", value: formatCurrency(d.effectivePricePerItem), emphasis: true },
        ],
        note: `Pay for ${d.purchasedQuantity} of ${d.totalItems} items — get ${d.freeQuantity} free.`,
        copyText: [
          "Discount Calculator — Buy X Get Y",
          `Item price: ${formatCurrency(d.itemPrice)}`,
          `Buy ${d.purchasedQuantity}, get ${d.freeQuantity} free (${d.totalItems} items)`,
          `Amount payable: ${formatCurrency(d.amountPayable)}`,
          `Effective per item: ${formatCurrency(d.effectivePricePerItem)}`,
          `Effective discount: ${formatPercentage(d.effectiveDiscountPercent)}`,
        ].join("\n"),
      },
    };
  }

  const bundleQty = n(forms.bogo.bundleQty);
  const bundlePrice = n(forms.bogo.bundlePrice);
  if (bundleQty === null || bundlePrice === null) return incomplete();

  const r = calculateBundleDeal({
    itemPrice: price,
    bundleQuantity: bundleQty,
    bundlePrice,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const fullValue = d.itemPrice * d.bundleQuantity;
  return {
    state: "ok",
    view: {
      headlineLabel: "Amount Payable",
      headlineValue: formatCurrency(d.amountPayable),
      subLabel: "Effective Discount",
      subValue: formatPercentage(d.effectiveDiscountPercent),
      rows: [
        { label: "Regular item price", value: formatCurrency(d.itemPrice) },
        { label: `Bundle: ${d.bundleQuantity} items`, value: formatCurrency(fullValue) },
        { label: "Bundle price", value: formatCurrency(d.bundlePrice), emphasis: true },
        { label: "Effective price per item", value: formatCurrency(d.effectivePricePerItem), emphasis: true },
      ],
      note: `${d.bundleQuantity} items for ${formatCurrency(d.bundlePrice)} instead of ${formatCurrency(fullValue)}.`,
      copyText: [
        "Discount Calculator — Bundle Deal",
        `Item price: ${formatCurrency(d.itemPrice)}`,
        `Bundle: ${d.bundleQuantity} items for ${formatCurrency(d.bundlePrice)} (value ${formatCurrency(fullValue)})`,
        `Effective per item: ${formatCurrency(d.effectivePricePerItem)}`,
        `Effective discount: ${formatPercentage(d.effectiveDiscountPercent)}`,
      ].join("\n"),
    },
  };
}

// ── Mode E ───────────────────────────────────────────────────

function computeQuantity(forms: DiscountForms): ComputeState {
  const unitPrice = n(forms.quantity.unitPrice);
  const qty = n(forms.quantity.qty);
  const discountValue = optionalNum(forms.quantity.discountValue);
  if (unitPrice === null || qty === null || discountValue === null) return incomplete();

  const r = calculateQuantityDiscount({
    unitPrice,
    quantity: qty,
    discountType: forms.quantity.discountType,
    discountValue,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Final Amount",
      headlineValue: formatCurrency(d.finalAmount),
      subLabel: "You Save",
      subValue: formatCurrency(d.discountAmount),
      rows: [
        { label: `Subtotal (${formatCurrency(d.unitPrice)} × ${d.quantity})`, value: formatCurrency(d.subtotal) },
        { label: "Discount", value: `− ${formatCurrency(d.discountAmount)}` },
        { label: "Average price per item", value: formatCurrency(d.averagePricePerItem), emphasis: true },
      ],
      note: `Subtotal ${formatCurrency(d.subtotal)} − discount ${formatCurrency(d.discountAmount)} = ${formatCurrency(d.finalAmount)}.`,
      copyText: [
        "Discount Calculator — Quantity Deal",
        `Unit price: ${formatCurrency(d.unitPrice)} × ${d.quantity} = ${formatCurrency(d.subtotal)}`,
        `Discount: − ${formatCurrency(d.discountAmount)}`,
        `Final amount: ${formatCurrency(d.finalAmount)}`,
        `Average per item: ${formatCurrency(d.averagePricePerItem)}`,
      ].join("\n"),
    },
  };
}

// ── Mode F ───────────────────────────────────────────────────

function computeTax(forms: DiscountForms): ComputeState {
  const price = n(forms.tax.price);
  const discountPercent = optionalNum(forms.tax.discountPercent);
  const taxRate = optionalNum(forms.tax.taxRate);
  if (price === null || discountPercent === null || taxRate === null) return incomplete();

  const r = calculateTaxAfterDiscount({
    originalPrice: price,
    discountPercent,
    taxRate,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  return {
    state: "ok",
    view: {
      headlineLabel: "Final Amount",
      headlineValue: formatCurrency(d.finalAmount),
      subLabel: "You Save",
      subValue: formatCurrency(d.totalSavings),
      rows: [
        { label: "Original price", value: formatCurrency(d.originalPrice) },
        { label: `Discount (${formatPercentage(d.discountPercent)})`, value: `− ${formatCurrency(d.discountAmount)}` },
        { label: "Price after discount", value: formatCurrency(d.priceAfterDiscount) },
        { label: `Tax (${formatPercentage(d.taxRate)})`, value: `+ ${formatCurrency(d.taxAmount)}` },
      ],
      note: "Order: discount first, then tax on the discounted price.",
      copyText: [
        "Discount Calculator — Tax + Discount",
        `Original price: ${formatCurrency(d.originalPrice)}`,
        `Discount (${formatPercentage(d.discountPercent)}): − ${formatCurrency(d.discountAmount)}`,
        `After discount: ${formatCurrency(d.priceAfterDiscount)}`,
        `Tax (${formatPercentage(d.taxRate)}): + ${formatCurrency(d.taxAmount)}`,
        `Final amount: ${formatCurrency(d.finalAmount)}`,
        "Order: discount before tax.",
      ].join("\n"),
    },
  };
}

// ── Mode G ───────────────────────────────────────────────────

function computeCompare(forms: DiscountForms): ComputeState {
  const offers = forms.compare.offers.map((o) => {
    const price = n(o.price);
    const value = optionalNum(o.discountValue);
    return { price, value, form: o };
  });

  if (offers.some((o) => o.price === null || o.value === null)) return incomplete();
  if (offers.length < 2) return errorOf("Add at least two offers to compare");

  const r = compareOffers(
    offers.map((o) => ({
      name: o.form.name,
      originalPrice: o.price as number,
      discountType: o.form.discountType,
      discountValue: o.value as number,
    })),
  );
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const best = d.offers[d.bestIndex];

  const rows: ResultRow[] = d.offers.map((o) => ({
    label: `${o.name} · save ${formatCurrency(o.savings)}`,
    value: formatCurrency(o.finalPrice),
    emphasis: o.isBest,
  }));

  const copyLines = [
    "Discount Calculator — Offer Comparison",
    ...d.offers.map(
      (o) =>
        `${o.name}: ${formatCurrency(o.originalPrice)} → ${formatCurrency(o.finalPrice)} (save ${formatCurrency(o.savings)}, ${formatPercentage(o.savingsPercent)})${o.isBest ? " ★ BEST" : ` (+${formatCurrency(o.differenceFromBest)} vs best)`}`,
    ),
    `Best: ${best.name} at ${formatCurrency(best.finalPrice)}`,
    d.priceGap > 0 ? `Difference between offers: ${formatCurrency(d.priceGap)}` : "All offers cost the same.",
  ];

  return {
    state: "ok",
    view: {
      headlineLabel: "Best Price",
      headlineValue: formatCurrency(best.finalPrice),
      subLabel: "Best Offer",
      subValue: best.name,
      rows,
      note:
        d.priceGap > 0
          ? `${best.name} saves you ${formatCurrency(d.priceGap)} versus the priciest offer.`
          : "All offers result in the same payable amount.",
      copyText: copyLines.filter(Boolean).join("\n"),
    },
  };
}

// ── Mode H ───────────────────────────────────────────────────

function computeBasket(forms: DiscountForms): ComputeState {
  const items = forms.basket.items.map((item) => ({
    form: item,
    mrp: n(item.mrp),
    qty: n(item.qty),
    discountValue: optionalNum(item.discountValue),
    taxRate: optionalNum(item.taxRate),
  }));

  if (items.some((i) => i.mrp === null || i.qty === null || i.discountValue === null || i.taxRate === null)) {
    return incomplete();
  }

  const r = calculateBasketBill(
    items.map((i) => ({
      name: i.form.name,
      mrp: i.mrp as number,
      quantity: i.qty as number,
      discountType: i.form.discountType,
      discountValue: i.discountValue as number,
      taxRate: i.taxRate as number,
    })),
  );
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const itemRows: ResultRow[] = d.items.map((item) => ({
    label: `${item.name} × ${item.quantity}`,
    value: formatCurrency(item.payable),
  }));

  return {
    state: "ok",
    view: {
      headlineLabel: "Total Payable",
      headlineValue: formatCurrency(d.totalPayable),
      subLabel: "Total Savings",
      subValue: formatCurrency(d.totalSavings),
      rows: [
        { label: "Total MRP", value: formatCurrency(d.totalMrp) },
        { label: "Total discount", value: `− ${formatCurrency(d.totalDiscount)}` },
        { label: "Taxable amount", value: formatCurrency(d.taxableAmount) },
        { label: "Estimated tax", value: `+ ${formatCurrency(d.estimatedTax)}` },
      ],
      breakdown: { title: "Per item", rows: itemRows },
      note: "Discount applies first, then tax on the discounted amount (per item).",
      copyText: [
        "Discount Calculator — Counter Bill",
        ...d.items.map(
          (i) =>
            `${i.name} × ${i.quantity}: MRP ${formatCurrency(i.lineTotal)} − ${formatCurrency(i.discountAmount)} + tax ${formatCurrency(i.taxAmount)} = ${formatCurrency(i.payable)}`,
        ),
        `Total MRP: ${formatCurrency(d.totalMrp)}`,
        `Total discount: − ${formatCurrency(d.totalDiscount)}`,
        `Taxable amount: ${formatCurrency(d.taxableAmount)}`,
        `Estimated tax: + ${formatCurrency(d.estimatedTax)}`,
        `Total payable: ${formatCurrency(d.totalPayable)}`,
        `You save: ${formatCurrency(d.totalSavings)}`,
      ].join("\n"),
    },
  };
}
