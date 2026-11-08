/**
 * Turns the raw form into a validated ResultView via the unit engine.
 * Empty value keeps the state "incomplete"; everything else is the
 * engine's strict validation surfaced as an error message.
 */

import {
  convertUnits,
  getCategory,
  unitRate,
  type UnitCategoryId,
} from "../../engine/unit-converter";
import type { ComputeState } from "../shared/result-types";
import type { UnitForm } from "./types";

/** Temperature has no single rate — show the exact formula instead. */
const TEMPERATURE_FORMULAS: Record<string, string> = {
  "C>F": "°F = °C × 9/5 + 32",
  "F>C": "°C = (°F − 32) × 5/9",
  "C>K": "K = °C + 273.15",
  "K>C": "°C = K − 273.15",
  "F>K": "K = (°F − 32) × 5/9 + 273.15",
  "K>F": "°F = (K − 273.15) × 9/5 + 32",
};

export function computeUnitResult(form: UnitForm): ComputeState {
  if (!form.value.trim()) return { state: "incomplete" };

  const value = Number(form.value.trim());
  const r = convertUnits({
    category: form.category,
    value,
    fromUnit: form.fromUnit,
    toUnit: form.toUnit,
  });
  if (!r.ok) return { state: "error", message: r.error };

  const d = r.data;
  const category = getCategory(form.category)!;
  const rate = unitRate(form.category, form.fromUnit, form.toUnit);
  const isTemperature = category.id === "temperature";
  const formula =
    form.fromUnit === form.toUnit
      ? "Same unit — the value is unchanged."
      : TEMPERATURE_FORMULAS[`${form.fromUnit}>${form.toUnit}`] ?? null;

  const operation = `${form.value.trim()} ${d.from.symbol} → ${d.to.symbol}`;

  return {
    state: "ok",
    view: {
      headlineLabel: operation,
      headlineValue: d.result,
      subLabel: "Result unit",
      subValue: `${d.to.name} (${d.to.symbol})`,
      rows: [
        { label: "Category", value: category.name },
        {
          label: "From",
          value: `${form.value.trim()} ${d.from.symbol} — ${d.from.name}`,
        },
        {
          label: "To",
          value: `${d.result} ${d.to.symbol} — ${d.to.name}`,
          emphasis: true,
        },
        rate
          ? { label: "Rate", value: rate }
          : { label: "Formula", value: formula ?? "—" },
      ],
      note: rate
        ? `${rate} (base unit: ${category.base})`
        : formula
          ? `${formula} — temperature scales are offset, so there is no single rate.`
          : undefined,
      copyText: [
        `Unit Converter — ${category.name}`,
        `Input: ${form.value.trim()} ${d.from.symbol} (${d.from.name})`,
        `Result: ${d.result} ${d.to.symbol} (${d.to.name})`,
        rate ? `Rate: ${rate}` : formula ? `Formula: ${formula}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  };
}
