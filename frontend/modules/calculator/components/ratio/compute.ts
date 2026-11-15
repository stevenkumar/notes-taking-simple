/**
 * Turns raw form strings into a validated ResultView via the ratio engine.
 * Empty required fields keep the state "incomplete".
 */

import {
  divideInRatio,
  simplifyRatio,
  solveProportion,
} from "../../engine/ratio-calculator";
import { formatCurrency, formatPercentage, parseNumericInput } from "@/utils/format";
import type { ComputeState } from "../shared/result-types";
import type { RatioForms, RatioModeId } from "./types";

const n = parseNumericInput;

function incomplete(): ComputeState {
  return { state: "incomplete" };
}

function errorOf(message: string): ComputeState {
  return { state: "error", message };
}

export function computeRatioResult(
  mode: RatioModeId,
  forms: RatioForms,
): ComputeState {
  return mode === "simplify"
    ? computeSimplify(forms)
    : mode === "proportion"
      ? computeProportion(forms)
      : computeDivide(forms);
}

// ── Mode A: Simplify ratio ───────────────────────────────────

function computeSimplify(forms: RatioForms): ComputeState {
  const a = n(forms.simplify.firstTerm);
  const b = n(forms.simplify.secondTerm);
  if (a === null || b === null) return incomplete();

  const r = simplifyRatio({ firstTerm: a, secondTerm: b });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;

  return {
    state: "ok",
    view: {
      headlineLabel: "Simplified ratio",
      headlineValue: `${d.firstTerm} : ${d.secondTerm}`,
      subLabel: "Greatest common divisor",
      subValue: String(d.gcd),
      rows: [
        {
          label: "Original ratio",
          value: `${d.originalFirst} : ${d.originalSecond}`,
        },
        {
          label: "Simplified",
          value: `${d.firstTerm} : ${d.secondTerm}`,
          emphasis: true,
        },
        { label: "Fraction", value: `${d.firstTerm}/${d.secondTerm}` },
        { label: "GCD", value: String(d.gcd) },
        { label: "First term share", value: formatPercentage(d.percentFirst) },
        { label: "Second term share", value: formatPercentage(d.percentSecond) },
      ],
      note: `Divide both terms by their GCD: ${d.originalFirst} : ${d.originalSecond} ÷ ${d.gcd} → ${d.firstTerm} : ${d.secondTerm}`,
      copyText: [
        "Ratio & Proportion Calculator — Simplify Ratio",
        `Original ratio: ${d.originalFirst} : ${d.originalSecond}`,
        `Simplified: ${d.firstTerm} : ${d.secondTerm}`,
        `Fraction: ${d.firstTerm}/${d.secondTerm}`,
        `GCD: ${d.gcd}`,
        `First term share: ${formatPercentage(d.percentFirst)}`,
        `Second term share: ${formatPercentage(d.percentSecond)}`,
      ].join("\n"),
    },
  };
}

// ── Mode B: Solve proportion ─────────────────────────────────

function computeProportion(forms: RatioForms): ComputeState {
  const a = n(forms.proportion.firstTerm);
  const b = n(forms.proportion.secondTerm);
  const c = n(forms.proportion.thirdTerm);
  if (a === null || b === null || c === null) return incomplete();

  const r = solveProportion({ firstTerm: a, secondTerm: b, thirdTerm: c });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;
  const solved = String(d.solvedTerm);

  return {
    state: "ok",
    view: {
      headlineLabel: "Missing term (x)",
      headlineValue: solved,
      subLabel: "Completed proportion",
      subValue: `${d.firstTerm} : ${d.secondTerm} = ${d.thirdTerm} : ${solved}`,
      rows: [
        { label: "Left ratio", value: `${d.firstTerm} : ${d.secondTerm}` },
        { label: "Right ratio", value: `${d.thirdTerm} : ${solved}` },
        { label: "Missing term (x)", value: solved, emphasis: true },
      ],
      note: `x = (second × third) ÷ first → (${d.secondTerm} × ${d.thirdTerm}) ÷ ${d.firstTerm} = ${solved}`,
      copyText: [
        "Ratio & Proportion Calculator — Solve Proportion",
        `Proportion: ${d.firstTerm} : ${d.secondTerm} = ${d.thirdTerm} : x`,
        `Missing term (x): ${solved}`,
      ].join("\n"),
    },
  };
}

// ── Mode C: Divide amount in ratio ───────────────────────────

function computeDivide(forms: RatioForms): ComputeState {
  const amount = n(forms.divide.amount);
  const a = n(forms.divide.firstTerm);
  const b = n(forms.divide.secondTerm);
  if (amount === null || a === null || b === null) return incomplete();

  const r = divideInRatio({ amount, firstTerm: a, secondTerm: b });
  if (!r.ok) return errorOf(r.error);
  const d = r.data;
  const ratio = `${d.firstTerm} : ${d.secondTerm}`;

  return {
    state: "ok",
    view: {
      headlineLabel: "First share",
      headlineValue: formatCurrency(d.firstShare),
      subLabel: "Second share",
      subValue: formatCurrency(d.secondShare),
      rows: [
        { label: "Amount", value: formatCurrency(d.amount) },
        { label: "Ratio", value: ratio },
        { label: "Total parts", value: String(d.totalParts) },
        {
          label: `First share (${d.firstTerm} part${d.firstTerm === 1 ? "" : "s"})`,
          value: formatCurrency(d.firstShare),
          emphasis: true,
        },
        {
          label: `Second share (${d.secondTerm} part${d.secondTerm === 1 ? "" : "s"})`,
          value: formatCurrency(d.secondShare),
          emphasis: true,
        },
        { label: "First share %", value: formatPercentage(d.percentFirst) },
        { label: "Second share %", value: formatPercentage(d.percentSecond) },
      ],
      note: `First share = amount × ${d.firstTerm} ÷ ${d.totalParts} → ${formatCurrency(d.amount)} × ${d.firstTerm} ÷ ${d.totalParts} = ${formatCurrency(d.firstShare)}; second share = amount − first share`,
      copyText: [
        "Ratio & Proportion Calculator — Divide in Ratio",
        `Amount: ${formatCurrency(d.amount)}`,
        `Ratio: ${ratio} (${d.totalParts} parts)`,
        `First share: ${formatCurrency(d.firstShare)}`,
        `Second share: ${formatCurrency(d.secondShare)}`,
        `First share %: ${formatPercentage(d.percentFirst)}`,
        `Second share %: ${formatPercentage(d.percentSecond)}`,
      ].join("\n"),
    },
  };
}
