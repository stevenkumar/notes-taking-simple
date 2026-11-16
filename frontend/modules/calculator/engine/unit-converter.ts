/**
 * Unit Converter – calculation engine.
 *
 * Pure functions using decimal arithmetic (decimal.js) per PRD §14:
 * no `eval`, no mutation, no clock. Every category converts through its
 * base unit with exact decimal factors — ratios such as km/h use a
 * "numerator/denominator" factor string so 1000/3600 stays exact
 * instead of being flattened to a repeating decimal.
 *
 * Rounding policy for displayed results (documented, tested):
 *   - 12 significant digits, half-up, trailing fractional zeros stripped
 *     (so exact conversions like 1 acre = 4046.8564224 m² stay exact).
 *   - Zero always renders as "0" (never "-0").
 *   - |x| ≥ 1e15 or 0 < |x| < 1e-6 switches to exponential with 12
 *     significant digits so tiny/huge answers never become wall-of-zero
 *     strings.
 *
 * Temperature is the one offset category (°C/°F/K): it converts through
 * Celsius with the standard formulas instead of multiplicative factors.
 *
 * Validation: returns a discriminated CalculationResult, never throws.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared idempotent config (precision far beyond any conversion need).
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Types ────────────────────────────────────────────────────

export type UnitCategoryId =
  | "length"
  | "weight"
  | "temperature"
  | "area"
  | "volume"
  | "speed"
  | "storage"
  | "pressure"
  | "energy";

export interface UnitDef {
  id: string;
  /** Human name shown in the select, e.g. "Kilometer". */
  name: string;
  /** Display symbol, e.g. "km". */
  symbol: string;
  /**
   * Factor to the category base unit — a plain decimal string
   * ("0.3048") or an exact fraction ("1000/3600").
   * Temperature units omit it (they use offset formulas).
   */
  factor?: string;
}

export interface CategoryDef {
  id: UnitCategoryId;
  name: string;
  /** Base unit symbol (m, kg, °C, m², L, m/s, B, Pa, J). */
  base: string;
  units: UnitDef[];
}

// ── Unit tables ──────────────────────────────────────────────

export const UNIT_CATEGORIES: CategoryDef[] = [
  {
    id: "length",
    name: "Length",
    base: "m",
    units: [
      { id: "mm", name: "Millimeter", symbol: "mm", factor: "0.001" },
      { id: "cm", name: "Centimeter", symbol: "cm", factor: "0.01" },
      { id: "m", name: "Meter", symbol: "m", factor: "1" },
      { id: "km", name: "Kilometer", symbol: "km", factor: "1000" },
      { id: "in", name: "Inch", symbol: "in", factor: "0.0254" },
      { id: "ft", name: "Foot", symbol: "ft", factor: "0.3048" },
      { id: "yd", name: "Yard", symbol: "yd", factor: "0.9144" },
      { id: "mi", name: "Mile", symbol: "mi", factor: "1609.344" },
    ],
  },
  {
    id: "weight",
    name: "Weight",
    base: "kg",
    units: [
      { id: "mg", name: "Milligram", symbol: "mg", factor: "0.000001" },
      { id: "g", name: "Gram", symbol: "g", factor: "0.001" },
      { id: "kg", name: "Kilogram", symbol: "kg", factor: "1" },
      { id: "quintal", name: "Quintal", symbol: "q", factor: "100" },
      { id: "tonne", name: "Tonne", symbol: "t", factor: "1000" },
      { id: "oz", name: "Ounce", symbol: "oz", factor: "0.028349523125" },
      { id: "lb", name: "Pound", symbol: "lb", factor: "0.45359237" },
    ],
  },
  {
    id: "temperature",
    name: "Temperature",
    base: "°C",
    units: [
      { id: "C", name: "Celsius", symbol: "°C" },
      { id: "F", name: "Fahrenheit", symbol: "°F" },
      { id: "K", name: "Kelvin", symbol: "K" },
    ],
  },
  {
    id: "area",
    name: "Area",
    base: "m²",
    units: [
      { id: "cm2", name: "Square centimeter", symbol: "cm²", factor: "0.0001" },
      { id: "m2", name: "Square meter", symbol: "m²", factor: "1" },
      { id: "ha", name: "Hectare", symbol: "ha", factor: "10000" },
      { id: "km2", name: "Square kilometer", symbol: "km²", factor: "1000000" },
      { id: "ft2", name: "Square foot", symbol: "ft²", factor: "0.09290304" },
      { id: "yd2", name: "Square yard", symbol: "yd²", factor: "0.83612736" },
      { id: "acre", name: "Acre", symbol: "acre", factor: "4046.8564224" },
      { id: "mi2", name: "Square mile", symbol: "mi²", factor: "2589988.110336" },
    ],
  },
  {
    id: "volume",
    name: "Volume",
    base: "L",
    units: [
      { id: "mL", name: "Milliliter", symbol: "mL", factor: "0.001" },
      { id: "L", name: "Liter", symbol: "L", factor: "1" },
      { id: "m3", name: "Cubic meter", symbol: "m³", factor: "1000" },
      { id: "floz", name: "Fluid ounce (US)", symbol: "fl oz", factor: "0.0295735295625" },
      { id: "cup", name: "Cup (US)", symbol: "cup", factor: "0.2365882365" },
      { id: "pt", name: "Pint (US)", symbol: "pt", factor: "0.473176473" },
      { id: "qt", name: "Quart (US)", symbol: "qt", factor: "0.946352946" },
      { id: "gal", name: "Gallon (US)", symbol: "gal", factor: "3.785411784" },
    ],
  },
  {
    id: "speed",
    name: "Speed",
    base: "m/s",
    units: [
      { id: "ms", name: "Meters per second", symbol: "m/s", factor: "1" },
      { id: "kmh", name: "Kilometers per hour", symbol: "km/h", factor: "1000/3600" },
      { id: "mph", name: "Miles per hour", symbol: "mph", factor: "1609.344/3600" },
      { id: "knot", name: "Knot", symbol: "kn", factor: "1852/3600" },
      { id: "fts", name: "Feet per second", symbol: "ft/s", factor: "0.3048" },
    ],
  },
  {
    id: "storage",
    name: "Storage",
    base: "B",
    units: [
      { id: "bit", name: "Bit", symbol: "bit", factor: "0.125" },
      { id: "B", name: "Byte", symbol: "B", factor: "1" },
      { id: "KB", name: "Kilobyte (1000)", symbol: "KB", factor: "1000" },
      { id: "MB", name: "Megabyte (1000)", symbol: "MB", factor: "1000000" },
      { id: "GB", name: "Gigabyte (1000)", symbol: "GB", factor: "1000000000" },
      { id: "TB", name: "Terabyte (1000)", symbol: "TB", factor: "1000000000000" },
      { id: "KiB", name: "Kibibyte (1024)", symbol: "KiB", factor: "1024" },
      { id: "MiB", name: "Mebibyte (1024)", symbol: "MiB", factor: "1048576" },
      { id: "GiB", name: "Gibibyte (1024)", symbol: "GiB", factor: "1073741824" },
      { id: "TiB", name: "Tebibyte (1024)", symbol: "TiB", factor: "1099511627776" },
    ],
  },
  {
    id: "pressure",
    name: "Pressure",
    base: "Pa",
    units: [
      { id: "Pa", name: "Pascal", symbol: "Pa", factor: "1" },
      { id: "kPa", name: "Kilopascal", symbol: "kPa", factor: "1000" },
      { id: "MPa", name: "Megapascal", symbol: "MPa", factor: "1000000" },
      { id: "bar", name: "Bar", symbol: "bar", factor: "100000" },
      { id: "atm", name: "Atmosphere", symbol: "atm", factor: "101325" },
      // psi: lbf/in² — 0.45359237 kg x 9.80665 m/s² over (0.0254 m)²,
      // kept as an exact fraction so no precision is lost to rounding.
      { id: "psi", name: "Pound per square inch", symbol: "psi", factor: "44482216152605/6451600000" },
      { id: "torr", name: "Torr", symbol: "Torr", factor: "101325/760" },
      { id: "mmHg", name: "Millimeter of mercury", symbol: "mmHg", factor: "133.322387415" },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    base: "J",
    units: [
      { id: "J", name: "Joule", symbol: "J", factor: "1" },
      { id: "kJ", name: "Kilojoule", symbol: "kJ", factor: "1000" },
      { id: "MJ", name: "Megajoule", symbol: "MJ", factor: "1000000" },
      { id: "cal", name: "Calorie (thermochemical)", symbol: "cal", factor: "4.184" },
      { id: "kcal", name: "Kilocalorie", symbol: "kcal", factor: "4184" },
      { id: "Wh", name: "Watt-hour", symbol: "Wh", factor: "3600" },
      { id: "kWh", name: "Kilowatt-hour", symbol: "kWh", factor: "3600000" },
      { id: "BTU", name: "British thermal unit (IT)", symbol: "BTU", factor: "1055.05585262" },
      { id: "eV", name: "Electronvolt", symbol: "eV", factor: "1.602176634e-19" },
    ],
  },
];

// ── Lookups ──────────────────────────────────────────────────

export function getCategory(id: string): CategoryDef | undefined {
  return UNIT_CATEGORIES.find((c) => c.id === id);
}

export function getUnit(category: CategoryDef, unitId: string): UnitDef | undefined {
  return category.units.find((u) => u.id === unitId);
}

/** "1000/3600" → exact Decimal division; plain strings parse directly. */
function factorValue(factor: string): Decimal {
  const parts = factor.split("/");
  return parts.length === 2
    ? new Decimal(parts[0]).div(parts[1])
    : new Decimal(factor);
}

// ── Formatting policy ────────────────────────────────────────

/** 12 significant digits half-up; exponential at the documented bounds. */
export function formatConversion(value: Decimal): string {
  if (value.isZero()) return "0";
  const abs = value.abs();
  if (abs.gte("1e15") || abs.lt("1e-6")) return value.toExponential(11);
  let out = value.toSignificantDigits(12).toString();
  if (out.includes(".") && !out.toLowerCase().includes("e")) {
    out = out.replace(/0+$/, "").replace(/\.$/, "");
  }
  return out;
}

// ── Temperature (offset) conversions ─────────────────────────

function toCelsius(value: Decimal, unitId: string): Decimal {
  switch (unitId) {
    case "C":
      return value;
    case "F":
      return value.minus(32).times(5).div(9);
    case "K":
      return value.minus(273.15);
    default:
      return value; // unreachable — validated earlier
  }
}

function fromCelsius(value: Decimal, unitId: string): Decimal {
  switch (unitId) {
    case "C":
      return value;
    case "F":
      return value.times(9).div(5).plus(32);
    case "K":
      return value.plus(273.15);
    default:
      return value;
  }
}

// ── Conversion ───────────────────────────────────────────────

export interface ConvertInputs {
  category: UnitCategoryId;
  value: number;
  fromUnit: string;
  toUnit: string;
}

export interface ConvertResult {
  category: CategoryDef;
  value: number;
  from: UnitDef;
  to: UnitDef;
  /** Rounded display string (formatConversion policy). */
  result: string;
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

export function convertUnits(
  inputs: ConvertInputs,
): CalculationResult<ConvertResult> {
  const { value, fromUnit, toUnit } = inputs;

  const category = getCategory(inputs.category);
  if (!category) return fail("Unknown conversion category");

  const from = getUnit(category, fromUnit);
  if (!from) return fail("Unknown unit", "fromUnit");
  const to = getUnit(category, toUnit);
  if (!to) return fail("Unknown unit", "toUnit");

  if (!Number.isFinite(value)) return fail("Enter a valid number", "value");
  if (value < 0 && category.id !== "temperature") {
    return fail("Enter a positive value", "value");
  }

  const dec = new Decimal(String(value));
  const isTemperature = category.id === "temperature";

  const converted = isTemperature
    ? from.id === to.id
      ? dec
      : fromCelsius(toCelsius(dec, from.id), to.id)
    : dec.times(factorValue(from.factor!)).div(factorValue(to.factor!));

  return {
    ok: true,
    data: {
      category,
      value,
      from,
      to,
      result: formatConversion(converted),
    },
  };
}

/**
 * Rate line for non-temperature categories: "1 m = 3.28083989501 ft".
 * Returns null for temperature (offset units have no single rate).
 */
export function unitRate(
  categoryId: string,
  fromUnit: string,
  toUnit: string,
): string | null {
  const category = getCategory(categoryId);
  if (!category || category.id === "temperature") return null;
  const from = getUnit(category, fromUnit);
  const to = getUnit(category, toUnit);
  if (!from || !to) return null;
  const rate = factorValue(from.factor!).div(factorValue(to.factor!));
  return `1 ${from.symbol} = ${formatConversion(rate)} ${to.symbol}`;
}
