/**
 * Unit Converter — form state.
 * The form holds one flat object so switching categories keeps the
 * typed value; units reset to that category's sensible defaults.
 */

import type { UnitCategoryId } from "../../engine/unit-converter";

export interface UnitForm {
  category: UnitCategoryId;
  /** Raw input string for the value being converted. */
  value: string;
  fromUnit: string;
  toUnit: string;
}

/** Stable initial state — 1 m → ft shows a live result on first paint. */
export const UNIT_INITIAL_FORM: UnitForm = {
  category: "length",
  value: "1",
  fromUnit: "m",
  toUnit: "ft",
};

/** Default unit pair when the category changes (value is preserved). */
export const CATEGORY_DEFAULT_UNITS: Record<
  UnitCategoryId,
  { from: string; to: string }
> = {
  length: { from: "m", to: "ft" },
  weight: { from: "kg", to: "lb" },
  temperature: { from: "C", to: "F" },
  area: { from: "m2", to: "ft2" },
  volume: { from: "L", to: "gal" },
  speed: { from: "kmh", to: "mph" },
};
