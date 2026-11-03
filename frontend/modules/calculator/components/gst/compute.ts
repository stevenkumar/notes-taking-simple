/**
 * Turns raw form strings into a validated ResultView via the GST engine.
 * Empty optional fields default to 0; every other field must be present
 * or the state stays "incomplete".
 */

import {
  calculateAddGst,
  calculateRemoveGst,
  findGstRate,
  type SupplyType,
} from "../../engine/gst-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState, ResultRow } from "../shared/result-types";
import type { GstForms, GstModeId } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

/** CGST + SGST vs IGST label helper. */
function splitRows(
  cgst: number,
  sgst: number,
  igst: number,
  rate: number,
): ResultRow[] {
  if (igst > 0) {
    return [{ label: `IGST (${formatPercentage(rate)})`, value: formatCurrency(igst) }];
  }
  if (cgst === 0 && sgst === 0) return []; // zero-rate invoice — nothing to split
  return [
    { label: `CGST (${formatPercentage(rate / 2)})`, value: formatCurrency(cgst) },
    { label: `SGST (${formatPercentage(rate / 2)})`, value: formatCurrency(sgst) },
  ];
}

export function computeGstResult(
  mode: GstModeId,
  forms: GstForms,
): ComputeState {
  switch (mode) {
    case "add":
      return computeAdd(forms);
    case "remove":
      return computeRemove(forms);
    case "findRate":
      return computeFindRate(forms);
  }
}

// ── Mode A: Add GST ──────────────────────────────────────────

function computeAdd(forms: GstForms): ComputeState {
  const amount = n(forms.add.amount);
  const rate = n(forms.add.rate);
  if (amount === null || rate === null) return incomplete();

  const r = calculateAddGst({
    baseAmount: amount,
    gstRate: rate,
    supplyType: forms.add.supplyType,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const supplyLabel =
    d.supplyType === "intra" ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)";

  return {
    state: "ok",
    view: {
      headlineLabel: "Total (incl. GST)",
      headlineValue: formatCurrency(d.totalAmount),
      subLabel: "GST Amount",
      subValue: formatCurrency(d.gstAmount),
      rows: [
        { label: "Amount without GST", value: formatCurrency(d.baseAmount) },
        { label: `GST (${formatPercentage(d.gstRate)})`, value: `+ ${formatCurrency(d.gstAmount)}` },
        ...splitRows(d.cgst, d.sgst, d.igst, d.gstRate),
        { label: "Total payable", value: formatCurrency(d.totalAmount), emphasis: true },
      ],
      note: `${supplyLabel} · ${formatCurrency(d.baseAmount)} × ${formatPercentage(d.gstRate)} = ${formatCurrency(d.gstAmount)}`,
      copyText: [
        "GST Calculator — Add GST",
        `Amount without GST: ${formatCurrency(d.baseAmount)}`,
        `GST (${formatPercentage(d.gstRate)}): + ${formatCurrency(d.gstAmount)}`,
        ...(d.supplyType === "intra"
          ? [
              `CGST (${formatPercentage(d.gstRate / 2)}): ${formatCurrency(d.cgst)}`,
              `SGST (${formatPercentage(d.gstRate / 2)}): ${formatCurrency(d.sgst)}`,
            ]
          : [`IGST (${formatPercentage(d.gstRate)}): ${formatCurrency(d.igst)}`]),
        `Total (incl. GST): ${formatCurrency(d.totalAmount)}`,
        `Supply type: ${supplyLabel}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: Remove GST ───────────────────────────────────────

function computeRemove(forms: GstForms): ComputeState {
  const amount = n(forms.remove.amount);
  const rate = n(forms.remove.rate);
  if (amount === null || rate === null) return incomplete();

  const r = calculateRemoveGst({
    totalAmount: amount,
    gstRate: rate,
    supplyType: forms.remove.supplyType,
  });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;
  const supplyLabel =
    d.supplyType === "intra" ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)";

  return {
    state: "ok",
    view: {
      headlineLabel: "Amount without GST",
      headlineValue: formatCurrency(d.baseAmount),
      subLabel: "GST Amount",
      subValue: formatCurrency(d.gstAmount),
      rows: [
        { label: "Total (incl. GST)", value: formatCurrency(d.totalAmount) },
        { label: `GST (${formatPercentage(d.gstRate)})`, value: `− ${formatCurrency(d.gstAmount)}` },
        ...splitRows(d.cgst, d.sgst, d.igst, d.gstRate),
        { label: "Base amount", value: formatCurrency(d.baseAmount), emphasis: true },
      ],
      note: `${supplyLabel} · ${formatCurrency(d.totalAmount)} ÷ ${(1 + d.gstRate / 100).toFixed(2)} = ${formatCurrency(d.baseAmount)}`,
      copyText: [
        "GST Calculator — Remove GST",
        `Total (incl. GST): ${formatCurrency(d.totalAmount)}`,
        `GST (${formatPercentage(d.gstRate)}): − ${formatCurrency(d.gstAmount)}`,
        ...(d.supplyType === "intra"
          ? [
              `CGST (${formatPercentage(d.gstRate / 2)}): ${formatCurrency(d.cgst)}`,
              `SGST (${formatPercentage(d.gstRate / 2)}): ${formatCurrency(d.sgst)}`,
            ]
          : [`IGST (${formatPercentage(d.gstRate)}): ${formatCurrency(d.igst)}`]),
        `Amount without GST: ${formatCurrency(d.baseAmount)}`,
        `Supply type: ${supplyLabel}`,
      ].join("\n"),
    },
  };
}

// ── Mode C: Find GST rate ────────────────────────────────────

function computeFindRate(forms: GstForms): ComputeState {
  const baseAmount = n(forms.findRate.baseAmount);
  const totalAmount = n(forms.findRate.totalAmount);
  if (baseAmount === null || totalAmount === null) return incomplete();

  const r = findGstRate({ baseAmount, totalAmount });
  if (!r.ok) return errorOf(r.error);

  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Effective GST Rate",
      headlineValue: formatPercentage(d.gstRate),
      subLabel: "GST Amount",
      subValue: formatCurrency(d.gstAmount),
      rows: [
        { label: "Amount without GST", value: formatCurrency(d.baseAmount) },
        { label: "Total (incl. GST)", value: formatCurrency(d.totalAmount) },
        { label: "GST amount", value: formatCurrency(d.gstAmount) },
        {
          label: "Split (intra-state)",
          value: `${formatCurrency(d.cgst)} + ${formatCurrency(d.sgst)}`,
          emphasis: true,
        },
      ],
      note: `${formatCurrency(d.gstAmount)} ÷ ${formatCurrency(d.baseAmount)} × 100 = ${formatPercentage(d.gstRate)}`,
      copyText: [
        "GST Calculator — Find GST Rate",
        `Amount without GST: ${formatCurrency(d.baseAmount)}`,
        `Total (incl. GST): ${formatCurrency(d.totalAmount)}`,
        `GST amount: ${formatCurrency(d.gstAmount)}`,
        `Effective GST rate: ${formatPercentage(d.gstRate)}`,
        `CGST: ${formatCurrency(d.cgst)} · SGST: ${formatCurrency(d.sgst)}`,
      ].join("\n"),
    },
  };
}
