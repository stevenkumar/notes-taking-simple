/**
 * Turns raw form strings into a validated ResultView via the profit & loss engine.
 * Empty required fields keep the state "incomplete".
 */

import {
  calculateCostPrice,
  calculateProfitLoss,
  calculateSellingPrice,
  rateBasisLabel,
} from "../../engine/profit-loss-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState } from "../shared/result-types";
import type { ProfitLossForms, ProfitLossModeId } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeProfitLossResult(
  mode: ProfitLossModeId,
  forms: ProfitLossForms,
): ComputeState {
  return mode === "outcome"
    ? computeOutcome(forms)
    : mode === "selling"
      ? computeSelling(forms)
      : computeCost(forms);
}

// ── Mode A: Profit or Loss ───────────────────────────────────

function computeOutcome(forms: ProfitLossForms): ComputeState {
  const cp = n(forms.outcome.costPrice);
  const sp = n(forms.outcome.sellingPrice);
  if (cp === null || sp === null) return incomplete();

  const r = calculateProfitLoss({ costPrice: cp, sellingPrice: sp });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;

  const verdict =
    d.outcome === "profit" ? "Profit" : d.outcome === "loss" ? "Loss" : "Break-even";
  const amount = formatCurrency(Math.abs(d.profitAmount));

  return {
    state: "ok",
    view: {
      headlineLabel: verdict,
      headlineValue: amount,
      subLabel: d.outcome === "break-even" ? "Selling price vs cost" : `${verdict} %`,
      subValue:
        d.outcome === "break-even"
          ? `${formatCurrency(d.sellingPrice)} = ${formatCurrency(d.costPrice)}`
          : formatPercentage(Math.abs(d.profitPercent)),
      rows: [
        { label: "Cost price", value: formatCurrency(d.costPrice) },
        { label: "Selling price", value: formatCurrency(d.sellingPrice) },
        {
          label: d.outcome === "loss" ? "Loss amount" : "Profit amount",
          value: formatCurrency(d.profitAmount),
          emphasis: true,
        },
        { label: "Profit % on cost (markup)", value: formatPercentage(d.profitPercent) },
        {
          label: "Margin % on selling price",
          value: formatPercentage(d.marginPercent),
        },
      ],
      note: `${verdict} = selling price − cost price → ${formatCurrency(d.sellingPrice)} − ${formatCurrency(d.costPrice)} = ${formatCurrency(d.profitAmount)}; markup = profit ÷ cost × 100, margin = profit ÷ selling × 100`,
      copyText: [
        "Profit & Loss Calculator — Profit or Loss",
        `Cost price: ${formatCurrency(d.costPrice)}`,
        `Selling price: ${formatCurrency(d.sellingPrice)}`,
        `${verdict}: ${amount}`,
        `Profit % on cost (markup): ${formatPercentage(d.profitPercent)}`,
        `Margin % on selling price: ${formatPercentage(d.marginPercent)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: Find Selling Price ───────────────────────────────

function computeSelling(forms: ProfitLossForms): ComputeState {
  const cp = n(forms.selling.costPrice);
  const rate = n(forms.selling.rate);
  if (cp === null || rate === null) return incomplete();

  const r = calculateSellingPrice({
    costPrice: cp,
    rate,
    basis: forms.selling.basis,
  });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;
  const basisLabel = rateBasisLabel(d.basis);

  return {
    state: "ok",
    view: {
      headlineLabel: "Selling price",
      headlineValue: formatCurrency(d.sellingPrice),
      subLabel: "Profit amount",
      subValue: formatCurrency(d.profitAmount),
      rows: [
        { label: "Cost price", value: formatCurrency(d.costPrice) },
        { label: `Rate (${basisLabel.toLowerCase()})`, value: formatPercentage(d.rate) },
        {
          label: "Selling price",
          value: formatCurrency(d.sellingPrice),
          emphasis: true,
        },
        { label: "Profit amount", value: formatCurrency(d.profitAmount) },
        { label: "Profit % on cost (markup)", value: formatPercentage(d.markupPercent) },
        {
          label: "Margin % on selling price",
          value: formatPercentage(d.marginPercent),
        },
      ],
      note:
        d.basis === "markup"
          ? `Selling price = cost × (1 + markup ÷ 100) → ${formatCurrency(d.costPrice)} × ${formatPercentage(d.rate)} = ${formatCurrency(d.sellingPrice)}`
          : `Selling price = cost ÷ (1 − margin ÷ 100) → ${formatCurrency(d.costPrice)} ÷ ${formatPercentage(d.rate)} = ${formatCurrency(d.sellingPrice)}`,
      copyText: [
        "Profit & Loss Calculator — Find Selling Price",
        `Cost price: ${formatCurrency(d.costPrice)}`,
        `Rate (${basisLabel}): ${formatPercentage(d.rate)}`,
        `Selling price: ${formatCurrency(d.sellingPrice)}`,
        `Profit amount: ${formatCurrency(d.profitAmount)}`,
        `Profit % on cost (markup): ${formatPercentage(d.markupPercent)}`,
        `Margin % on selling price: ${formatPercentage(d.marginPercent)}`,
      ].join("\n"),
    },
  };
}

// ── Mode C: Find Cost Price ──────────────────────────────────

function computeCost(forms: ProfitLossForms): ComputeState {
  const sp = n(forms.cost.sellingPrice);
  const rate = n(forms.cost.rate);
  if (sp === null || rate === null) return incomplete();

  const r = calculateCostPrice({
    sellingPrice: sp,
    rate,
    basis: forms.cost.basis,
  });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;
  const basisLabel = rateBasisLabel(d.basis);

  return {
    state: "ok",
    view: {
      headlineLabel: "Cost price",
      headlineValue: formatCurrency(d.costPrice),
      subLabel: "Profit amount",
      subValue: formatCurrency(d.profitAmount),
      rows: [
        { label: "Selling price", value: formatCurrency(d.sellingPrice) },
        { label: `Rate (${basisLabel.toLowerCase()})`, value: formatPercentage(d.rate) },
        {
          label: "Cost price",
          value: formatCurrency(d.costPrice),
          emphasis: true,
        },
        { label: "Profit amount", value: formatCurrency(d.profitAmount) },
        { label: "Profit % on cost (markup)", value: formatPercentage(d.markupPercent) },
        {
          label: "Margin % on selling price",
          value: formatPercentage(d.marginPercent),
        },
      ],
      note:
        d.basis === "markup"
          ? `Cost price = selling ÷ (1 + markup ÷ 100) → ${formatCurrency(d.sellingPrice)} ÷ ${formatPercentage(d.rate)} = ${formatCurrency(d.costPrice)}`
          : `Cost price = selling × (1 − margin ÷ 100) → ${formatCurrency(d.sellingPrice)} × ${formatPercentage(d.rate)} = ${formatCurrency(d.costPrice)}`,
      copyText: [
        "Profit & Loss Calculator — Find Cost Price",
        `Selling price: ${formatCurrency(d.sellingPrice)}`,
        `Rate (${basisLabel}): ${formatPercentage(d.rate)}`,
        `Cost price: ${formatCurrency(d.costPrice)}`,
        `Profit amount: ${formatCurrency(d.profitAmount)}`,
        `Profit % on cost (markup): ${formatPercentage(d.markupPercent)}`,
        `Margin % on selling price: ${formatPercentage(d.marginPercent)}`,
      ].join("\n"),
    },
  };
}
