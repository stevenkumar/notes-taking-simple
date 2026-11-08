import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  UNIT_CATEGORIES,
  convertUnits,
  formatConversion,
  getCategory,
  getUnit,
  unitRate,
} from "../unit-converter";

// ── Registry tables ──────────────────────────────────────────

describe("unit tables", () => {
  it("exposes the six supported categories", () => {
    expect(UNIT_CATEGORIES.map((c) => c.id)).toEqual([
      "length",
      "weight",
      "temperature",
      "area",
      "volume",
      "speed",
    ]);
  });

  it("every non-temperature unit has a factor; temperature units do not", () => {
    for (const cat of UNIT_CATEGORIES) {
      for (const unit of cat.units) {
        if (cat.id === "temperature") {
          expect(unit.factor).toBeUndefined();
        } else {
          expect(unit.factor, `${cat.id}/${unit.id}`).toBeTruthy();
        }
        expect(unit.symbol.length).toBeGreaterThan(0);
        expect(unit.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("looks up categories and units case-sensitively", () => {
    expect(getCategory("length")?.base).toBe("m");
    expect(getCategory("nope")).toBeUndefined();
    const speed = getCategory("speed")!;
    expect(getUnit(speed, "kmh")?.factor).toBe("1000/3600");
    expect(getUnit(speed, "KMH")).toBeUndefined();
  });
});

// ── Formatting policy ────────────────────────────────────────

describe("formatConversion", () => {
  it("renders zero as '0' (never '-0')", () => {
    expect(formatConversion(new Decimal(0))).toBe("0");
    expect(formatConversion(new Decimal("-0"))).toBe("0");
  });

  it("keeps exact conversions exact (trailing zeros stripped)", () => {
    expect(formatConversion(new Decimal("4046.8564224"))).toBe("4046.8564224");
    expect(formatConversion(new Decimal("5000"))).toBe("5000");
    expect(formatConversion(new Decimal("0.45359237"))).toBe("0.45359237");
  });

  it("rounds to 12 significant digits, half-up", () => {
    // 1/0.3048 = 3.2808398950131235… → 12 significant digits.
    expect(formatConversion(new Decimal(1).div("0.3048"))).toBe("3.28083989501");
  });

  it("switches to exponential at the documented bounds", () => {
    expect(formatConversion(new Decimal("1e15"))).toBe("1.00000000000e+15");
    expect(formatConversion(new Decimal("0.001").div("1609.344"))).toBe(
      "6.21371192237e-7",
    );
    // Just inside the fixed-notation bounds stays fixed.
    expect(formatConversion(new Decimal("999999999999"))).toBe("999999999999");
    expect(formatConversion(new Decimal("0.000001"))).toBe("0.000001");
  });
});

// ── Length ───────────────────────────────────────────────────

describe("convertUnits — length", () => {
  it("converts meters to feet", () => {
    const r = convertUnits({ category: "length", value: 1, fromUnit: "m", toUnit: "ft" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.result).toBe("3.28083989501");
  });

  it("converts kilometres to miles", () => {
    const r = convertUnits({ category: "length", value: 5, fromUnit: "km", toUnit: "mi" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.result).toBe("3.10685596119");
  });

  it("stays exact for inch ↔ centimetre", () => {
    const r = convertUnits({ category: "length", value: 1, fromUnit: "in", toUnit: "cm" });
    expect(r.ok && r.data.result).toBe("2.54");
  });

  it("returns the same value for identical units", () => {
    const r = convertUnits({ category: "length", value: 42, fromUnit: "m", toUnit: "m" });
    expect(r.ok && r.data.result).toBe("42");
  });

  it("renders a tiny result exponentially", () => {
    const r = convertUnits({ category: "length", value: 1, fromUnit: "mm", toUnit: "mi" });
    expect(r.ok && r.data.result).toBe("6.21371192237e-7");
  });

  it("rejects negative lengths", () => {
    const r = convertUnits({ category: "length", value: -5, fromUnit: "m", toUnit: "ft" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("Enter a positive value");
      expect(r.fieldErrors?.value).toBeTruthy();
    }
  });
});

// ── Weight ───────────────────────────────────────────────────

describe("convertUnits — weight", () => {
  it("converts pounds to kilograms exactly", () => {
    const r = convertUnits({ category: "weight", value: 1, fromUnit: "lb", toUnit: "kg" });
    expect(r.ok && r.data.result).toBe("0.45359237");
  });

  it("converts kilograms to ounces", () => {
    const r = convertUnits({ category: "weight", value: 1, fromUnit: "kg", toUnit: "oz" });
    expect(r.ok && r.data.result).toBe("35.2739619496");
  });

  it("converts tonnes to pounds", () => {
    const r = convertUnits({ category: "weight", value: 1, fromUnit: "tonne", toUnit: "lb" });
    expect(r.ok && r.data.result).toBe("2204.62262185");
  });

  it("scales grams from kilograms", () => {
    const r = convertUnits({ category: "weight", value: 2.5, fromUnit: "kg", toUnit: "g" });
    expect(r.ok && r.data.result).toBe("2500");
  });

  it("rejects negative weights", () => {
    const r = convertUnits({ category: "weight", value: -1, fromUnit: "kg", toUnit: "lb" });
    expect(r.ok).toBe(false);
  });
});

// ── Temperature (offset units) ──────────────────────────────

describe("convertUnits — temperature", () => {
  it("converts Celsius to Fahrenheit at the classic points", () => {
    const cases: Array<[number, string]> = [
      [0, "32"],
      [100, "212"],
      [37, "98.6"],
      [-40, "-40"],
    ];
    for (const [c, f] of cases) {
      const r = convertUnits({ category: "temperature", value: c, fromUnit: "C", toUnit: "F" });
      expect(r.ok && r.data.result).toBe(f);
    }
  });

  it("converts Fahrenheit to Celsius", () => {
    const r = convertUnits({ category: "temperature", value: 32, fromUnit: "F", toUnit: "C" });
    expect(r.ok && r.data.result).toBe("0");
  });

  it("converts Celsius to Kelvin and back", () => {
    const up = convertUnits({ category: "temperature", value: 37, fromUnit: "C", toUnit: "K" });
    expect(up.ok && up.data.result).toBe("310.15");
    const down = convertUnits({ category: "temperature", value: 300, fromUnit: "K", toUnit: "C" });
    expect(down.ok && down.data.result).toBe("26.85");
  });

  it("converts Kelvin to Fahrenheit", () => {
    const r = convertUnits({ category: "temperature", value: 300, fromUnit: "K", toUnit: "F" });
    expect(r.ok && r.data.result).toBe("80.33");
  });

  it("handles zero Kelvin (absolute zero)", () => {
    const r = convertUnits({ category: "temperature", value: 0, fromUnit: "K", toUnit: "C" });
    expect(r.ok && r.data.result).toBe("-273.15");
  });

  it("allows negative values (below zero) — unlike other categories", () => {
    const r = convertUnits({ category: "temperature", value: -40, fromUnit: "C", toUnit: "F" });
    expect(r.ok && r.data.result).toBe("-40");
  });

  it("identity keeps the exact input", () => {
    const r = convertUnits({ category: "temperature", value: -273.15, fromUnit: "C", toUnit: "C" });
    expect(r.ok && r.data.result).toBe("-273.15");
  });
});

// ── Area ─────────────────────────────────────────────────────

describe("convertUnits — area", () => {
  it("keeps the acre → m² definition exact", () => {
    const r = convertUnits({ category: "area", value: 1, fromUnit: "acre", toUnit: "m2" });
    expect(r.ok && r.data.result).toBe("4046.8564224");
  });

  it("converts square miles to acres (640 exactly)", () => {
    const r = convertUnits({ category: "area", value: 1, fromUnit: "mi2", toUnit: "acre" });
    expect(r.ok && r.data.result).toBe("640");
  });

  it("converts hectares to square metres", () => {
    const r = convertUnits({ category: "area", value: 2.5, fromUnit: "ha", toUnit: "m2" });
    expect(r.ok && r.data.result).toBe("25000");
  });
});

// ── Volume ───────────────────────────────────────────────────

describe("convertUnits — volume", () => {
  it("keeps the US gallon → litre definition exact", () => {
    const r = convertUnits({ category: "volume", value: 1, fromUnit: "gal", toUnit: "L" });
    expect(r.ok && r.data.result).toBe("3.785411784");
  });

  it("converts cups to fluid ounces (8 per cup)", () => {
    const r = convertUnits({ category: "volume", value: 2.5, fromUnit: "cup", toUnit: "floz" });
    expect(r.ok && r.data.result).toBe("20");
  });

  it("converts cubic metres to litres", () => {
    const r = convertUnits({ category: "volume", value: 3, fromUnit: "m3", toUnit: "L" });
    expect(r.ok && r.data.result).toBe("3000");
  });
});

// ── Speed (fraction factors) ────────────────────────────────

describe("convertUnits — speed", () => {
  it("converts km/h to mph", () => {
    const r = convertUnits({ category: "speed", value: 100, fromUnit: "kmh", toUnit: "mph" });
    expect(r.ok && r.data.result).toBe("62.1371192237");
  });

  it("converts m/s to km/h (×3.6)", () => {
    const r = convertUnits({ category: "speed", value: 10, fromUnit: "ms", toUnit: "kmh" });
    expect(r.ok && r.data.result).toBe("36");
  });

  it("converts knots to km/h (1.852 exactly)", () => {
    const r = convertUnits({ category: "speed", value: 1, fromUnit: "knot", toUnit: "kmh" });
    expect(r.ok && r.data.result).toBe("1.852");
  });

  it("converts mph to m/s", () => {
    const r = convertUnits({ category: "speed", value: 60, fromUnit: "mph", toUnit: "ms" });
    expect(r.ok && r.data.result).toBe("26.8224");
  });

  it("converts m/s to km/h the other way", () => {
    const r = convertUnits({ category: "speed", value: 3, fromUnit: "ms", toUnit: "kmh" });
    expect(r.ok && r.data.result).toBe("10.8");
  });
});

// ── Validation & rate line ───────────────────────────────────

describe("convertUnits — validation", () => {
  it("rejects non-finite values", () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const r = convertUnits({ category: "length", value, fromUnit: "m", toUnit: "ft" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("Enter a valid number");
    }
  });

  it("rejects unknown categories and units", () => {
    const badCat = convertUnits({
      category: "currency" as never,
      value: 1,
      fromUnit: "m",
      toUnit: "ft",
    });
    expect(badCat.ok).toBe(false);

    const badUnit = convertUnits({ category: "length", value: 1, fromUnit: "furlong", toUnit: "ft" });
    expect(badUnit.ok).toBe(false);
    if (!badUnit.ok) expect(badUnit.fieldErrors?.fromUnit).toBeTruthy();
  });

  it("allows zero values", () => {
    const r = convertUnits({ category: "length", value: 0, fromUnit: "m", toUnit: "ft" });
    expect(r.ok && r.data.result).toBe("0");
  });
});

describe("unitRate", () => {
  it("produces the rate line for factor categories", () => {
    expect(unitRate("length", "m", "ft")).toBe("1 m = 3.28083989501 ft");
    expect(unitRate("speed", "kmh", "mph")).toBe("1 km/h = 0.621371192237 mph");
    expect(unitRate("weight", "kg", "lb")).toBe("1 kg = 2.20462262185 lb");
  });

  it("returns null for temperature (offset units) and unknown units", () => {
    expect(unitRate("temperature", "C", "F")).toBeNull();
    expect(unitRate("length", "nope", "ft")).toBeNull();
    expect(unitRate("bogus", "m", "ft")).toBeNull();
  });
});
