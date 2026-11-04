import { describe, expect, it } from "vitest";
import {
  calculatePercentOf,
  findWhatPercent,
  calculatePercentChange,
  calculatePercentDifference,
  calculateIncrease,
  calculateDecrease,
  findOriginalBeforeIncrease,
  findOriginalBeforeDecrease,
  findWholeFromPercent,
  calculateSuccessiveChange,
} from "../percentage-calculator";

/** Assert a successful result and return its data. */
function ok<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`Expected success, got error: ${result.error}`);
  return result.data;
}

/** Assert a failed result and return the error message. */
function err(
  result: { ok: true; data: unknown } | { ok: false; error: string },
): string {
  if (result.ok) throw new Error("Expected an error, got success");
  return result.error;
}

// ════════════════════════════════════════════════════════════
// Mode A — Percent of number
// ════════════════════════════════════════════════════════════

describe("Mode A: percent of number", () => {
  it("computes 20% of 1500 = 300", () => {
    const r = ok(calculatePercentOf({ percent: 20, value: 1500 }));
    expect(r.result).toBe(300);
    expect(r.percent).toBe(20);
    expect(r.value).toBe(1500);
  });

  it("computes 12.5% of 80 = 10", () => {
    const r = ok(calculatePercentOf({ percent: 12.5, value: 80 }));
    expect(r.result).toBe(10);
  });

  it("returns 0 for 0% of anything", () => {
    const r = ok(calculatePercentOf({ percent: 0, value: 1000 }));
    expect(r.result).toBe(0);
  });

  it("handles a negative percent (signed contexts)", () => {
    const r = ok(calculatePercentOf({ percent: -10, value: 200 }));
    expect(r.result).toBe(-20);
  });

  it("rounds half-up to 2dp: 33.33% of 100 = 33.33", () => {
    const r = ok(calculatePercentOf({ percent: 33.33, value: 100 }));
    expect(r.result).toBe(33.33);
  });

  it("rejects NaN input", () => {
    expect(err(calculatePercentOf({ percent: NaN, value: 100 }))).toContain(
      "valid number",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Mode B — What percent
// ════════════════════════════════════════════════════════════

describe("Mode B: what percent", () => {
  it("computes 15 is what % of 60 = 25%", () => {
    const r = ok(findWhatPercent({ part: 15, whole: 60 }));
    expect(r.percent).toBe(25);
  });

  it("rounds: 3 is what % of 7 = 42.86%", () => {
    const r = ok(findWhatPercent({ part: 3, whole: 7 }));
    expect(r.percent).toBe(42.86);
  });

  it("returns 0% when the part is 0", () => {
    const r = ok(findWhatPercent({ part: 0, whole: 50 }));
    expect(r.percent).toBe(0);
  });

  it("returns 100% when part equals whole", () => {
    const r = ok(findWhatPercent({ part: 60, whole: 60 }));
    expect(r.percent).toBe(100);
  });

  it("rejects a zero whole (division by zero)", () => {
    const e = err(findWhatPercent({ part: 10, whole: 0 }));
    expect(e).toBe("Whole value cannot be 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode C — Percent change
// ════════════════════════════════════════════════════════════

describe("Mode C: percent change", () => {
  it("computes 200 → 250 = +25% (increase)", () => {
    const r = ok(calculatePercentChange({ from: 200, to: 250 }));
    expect(r.percent).toBe(25);
    expect(r.difference).toBe(50);
    expect(r.direction).toBe("increase");
  });

  it("computes 250 → 200 = −20% (decrease)", () => {
    const r = ok(calculatePercentChange({ from: 250, to: 200 }));
    expect(r.percent).toBe(-20);
    expect(r.difference).toBe(-50);
    expect(r.direction).toBe("decrease");
  });

  it("reports no change when the values are equal", () => {
    const r = ok(calculatePercentChange({ from: 50, to: 50 }));
    expect(r.percent).toBe(0);
    expect(r.difference).toBe(0);
    expect(r.direction).toBe("same");
  });

  it("computes 100 → 150 = 50%", () => {
    const r = ok(calculatePercentChange({ from: 100, to: 150 }));
    expect(r.percent).toBe(50);
  });

  it("rounds: 3 → 4 = 33.33%", () => {
    const r = ok(calculatePercentChange({ from: 3, to: 4 }));
    expect(r.percent).toBe(33.33);
  });

  it("rejects a starting value of 0", () => {
    const e = err(calculatePercentChange({ from: 0, to: 100 }));
    expect(e).toBe("Starting value cannot be 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode D — Percent difference
// ════════════════════════════════════════════════════════════

describe("Mode D: percent difference", () => {
  it("computes the difference between 100 and 150 = 40%", () => {
    const r = ok(calculatePercentDifference({ valueA: 100, valueB: 150 }));
    expect(r.difference).toBe(50);
    expect(r.average).toBe(125);
    expect(r.percent).toBe(40);
  });

  it("returns 0% for equal values", () => {
    const r = ok(calculatePercentDifference({ valueA: 100, valueB: 100 }));
    expect(r.difference).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("rounds: 50 vs 100 = 66.67%", () => {
    const r = ok(calculatePercentDifference({ valueA: 50, valueB: 100 }));
    expect(r.percent).toBe(66.67);
  });

  it("is symmetric (order does not matter)", () => {
    const ab = ok(calculatePercentDifference({ valueA: 40, valueB: 65 }));
    const ba = ok(calculatePercentDifference({ valueA: 65, valueB: 40 }));
    expect(ab.percent).toBe(ba.percent);
    expect(ab.difference).toBe(ba.difference);
  });

  it("rejects values that average to 0", () => {
    const e = err(calculatePercentDifference({ valueA: 0, valueB: 0 }));
    expect(e).toBe("The two values cannot add up to 0");
    expect(
      err(calculatePercentDifference({ valueA: 100, valueB: -100 })),
    ).toBe("The two values cannot add up to 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode E — Increase by percent
// ════════════════════════════════════════════════════════════

describe("Mode E: increase by percent", () => {
  it("increases 1500 by 20% → 1800 (increase 300)", () => {
    const r = ok(calculateIncrease({ value: 1500, percent: 20 }));
    expect(r.increase).toBe(300);
    expect(r.result).toBe(1800);
  });

  it("increases 80 by 12.5% → 90", () => {
    const r = ok(calculateIncrease({ value: 80, percent: 12.5 }));
    expect(r.increase).toBe(10);
    expect(r.result).toBe(90);
  });

  it("0% leaves the value unchanged", () => {
    const r = ok(calculateIncrease({ value: 100, percent: 0 }));
    expect(r.increase).toBe(0);
    expect(r.result).toBe(100);
  });

  it("keeps value + increase = result exactly", () => {
    const r = ok(calculateIncrease({ value: 1234.56, percent: 7.5 }));
    // Normalise the JS float sum to 2dp before comparing (engine is decimal-exact).
    expect(Number((r.value + r.increase).toFixed(2))).toBe(r.result);
    // 1234.56 × 7.5% = 92.592 → 92.59
    expect(r.increase).toBe(92.59);
    expect(r.result).toBe(1327.15);
  });
});

// ════════════════════════════════════════════════════════════
// Mode F — Decrease by percent
// ════════════════════════════════════════════════════════════

describe("Mode F: decrease by percent", () => {
  it("decreases 1500 by 20% → 1200 (decrease 300)", () => {
    const r = ok(calculateDecrease({ value: 1500, percent: 20 }));
    expect(r.decrease).toBe(300);
    expect(r.result).toBe(1200);
  });

  it("decreases 80 by 12.5% → 70", () => {
    const r = ok(calculateDecrease({ value: 80, percent: 12.5 }));
    expect(r.decrease).toBe(10);
    expect(r.result).toBe(70);
  });

  it("0% leaves the value unchanged", () => {
    const r = ok(calculateDecrease({ value: 100, percent: 0 }));
    expect(r.decrease).toBe(0);
    expect(r.result).toBe(100);
  });

  it("keeps value − decrease = result exactly", () => {
    const r = ok(calculateDecrease({ value: 1234.56, percent: 7.5 }));
    expect(Number((r.value - r.decrease).toFixed(2))).toBe(r.result);
    expect(r.result).toBe(1141.97);
  });
});

// ════════════════════════════════════════════════════════════
// Mode G — Original before an increase
// ════════════════════════════════════════════════════════════

describe("Mode G: original before an increase", () => {
  it("1800 after a 20% rise → original 1500", () => {
    const r = ok(findOriginalBeforeIncrease({ final: 1800, percent: 20 }));
    expect(r.original).toBe(1500);
    expect(r.increase).toBe(300);
  });

  it("90 after a 12.5% rise → original 80", () => {
    const r = ok(findOriginalBeforeIncrease({ final: 90, percent: 12.5 }));
    expect(r.original).toBe(80);
    expect(r.increase).toBe(10);
  });

  it("0% means the original equals the final", () => {
    const r = ok(findOriginalBeforeIncrease({ final: 100, percent: 0 }));
    expect(r.original).toBe(100);
    expect(r.increase).toBe(0);
  });

  it("keeps original + increase = final exactly", () => {
    const r = ok(findOriginalBeforeIncrease({ final: 1499.99, percent: 18 }));
    expect(Number((r.original + r.increase).toFixed(2))).toBe(r.final);
  });

  it("rejects percent ≤ −100 (zero/negative divisor)", () => {
    const e = err(findOriginalBeforeIncrease({ final: 500, percent: -100 }));
    expect(e).toBe("Percent must be greater than −100%");
  });

  it("rejects a non-positive final value", () => {
    expect(
      err(findOriginalBeforeIncrease({ final: 0, percent: 20 })),
    ).toContain("greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode H — Original before a discount
// ════════════════════════════════════════════════════════════

describe("Mode H: original before a discount", () => {
  it("₹800 sale price at 20% off → MRP 1000", () => {
    const r = ok(findOriginalBeforeDecrease({ final: 800, percent: 20 }));
    expect(r.original).toBe(1000);
    expect(r.decrease).toBe(200);
  });

  it("70 after 12.5% off → original 80", () => {
    const r = ok(findOriginalBeforeDecrease({ final: 70, percent: 12.5 }));
    expect(r.original).toBe(80);
    expect(r.decrease).toBe(10);
  });

  it("900 after 10% off → original 1000", () => {
    const r = ok(findOriginalBeforeDecrease({ final: 900, percent: 10 }));
    expect(r.original).toBe(1000);
    expect(r.decrease).toBe(100);
  });

  it("keeps original − decrease = final exactly", () => {
    const r = ok(findOriginalBeforeDecrease({ final: 649.99, percent: 15 }));
    expect(Number((r.original - r.decrease).toFixed(2))).toBe(r.final);
  });

  it("rejects a 100% discount (free item, original unknowable)", () => {
    const e = err(findOriginalBeforeDecrease({ final: 500, percent: 100 }));
    expect(e).toBe("Discount percent must be less than 100%");
  });

  it("rejects a negative discount", () => {
    const e = err(findOriginalBeforeDecrease({ final: 500, percent: -10 }));
    expect(e).toBe("Discount percent cannot be negative");
  });
});

// ════════════════════════════════════════════════════════════
// Mode I — Percent of what
// ════════════════════════════════════════════════════════════

describe("Mode I: percent of what", () => {
  it("500 is 15% of 3333.33", () => {
    const r = ok(findWholeFromPercent({ part: 500, percent: 15 }));
    // 50000 ÷ 15 = 3333.333… → 3333.33
    expect(r.whole).toBe(3333.33);
  });

  it("300 is 25% of 1200", () => {
    const r = ok(findWholeFromPercent({ part: 300, percent: 25 }));
    expect(r.whole).toBe(1200);
  });

  it("0 is any percent of 0", () => {
    const r = ok(findWholeFromPercent({ part: 0, percent: 10 }));
    expect(r.whole).toBe(0);
  });

  it("100% means the part is the whole", () => {
    const r = ok(findWholeFromPercent({ part: 60, percent: 100 }));
    expect(r.whole).toBe(60);
  });

  it("rejects percent of 0", () => {
    const e = err(findWholeFromPercent({ part: 500, percent: 0 }));
    expect(e).toBe("Percent must be greater than 0");
  });

  it("rejects a negative percent", () => {
    const e = err(findWholeFromPercent({ part: 500, percent: -5 }));
    expect(e).toBe("Percent must be greater than 0");
  });

  it("rejects a negative part", () => {
    expect(err(findWholeFromPercent({ part: -100, percent: 20 }))).toContain(
      "cannot be negative",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Mode J — Combined (successive) percent change
// ════════════════════════════════════════════════════════════

describe("Mode J: combined percent change", () => {
  it("+10% then +20% = single +32% (×1.32)", () => {
    const r = ok(calculateSuccessiveChange({ first: 10, second: 20 }));
    expect(r.multiplier).toBe(1.32);
    expect(r.netPercent).toBe(32);
  });

  it("+10% then −10% = net −1% (not 0%)", () => {
    const r = ok(calculateSuccessiveChange({ first: 10, second: -10 }));
    expect(r.multiplier).toBe(0.99);
    expect(r.netPercent).toBe(-1);
  });

  it("+20% then −50% = net −40% (×0.6)", () => {
    const r = ok(calculateSuccessiveChange({ first: 20, second: -50 }));
    expect(r.multiplier).toBe(0.6);
    expect(r.netPercent).toBe(-40);
  });

  it("0% + 0% = no change (×1)", () => {
    const r = ok(calculateSuccessiveChange({ first: 0, second: 0 }));
    expect(r.multiplier).toBe(1);
    expect(r.netPercent).toBe(0);
  });

  it("allows a total loss (−100% → multiplier 0)", () => {
    const r = ok(calculateSuccessiveChange({ first: -100, second: 0 }));
    expect(r.multiplier).toBe(0);
    expect(r.netPercent).toBe(-100);
  });

  it("rejects a drop beyond −100%", () => {
    expect(
      err(calculateSuccessiveChange({ first: -150, second: 10 })),
    ).toBe("First change cannot be less than −100%");
    expect(
      err(calculateSuccessiveChange({ first: 10, second: -150 })),
    ).toBe("Second change cannot be less than −100%");
  });
});

// ════════════════════════════════════════════════════════════
// Cross-mode invariants
// ════════════════════════════════════════════════════════════

describe("cross-mode invariants", () => {
  it("decrease then reverse recovers the original (round trip)", () => {
    const cases = [
      { value: 100, percent: 5 },
      { value: 250.5, percent: 12.5 },
      { value: 1234.56, percent: 33 },
      { value: 9999.99, percent: 7.5 },
    ];
    for (const c of cases) {
      const down = ok(calculateDecrease(c));
      const back = ok(
        findOriginalBeforeDecrease({ final: down.result, percent: c.percent }),
      );
      expect(Math.abs(back.original - c.value)).toBeLessThanOrEqual(0.01);
    }
  });

  it("increase then reverse recovers the original (round trip)", () => {
    const cases = [
      { value: 1500, percent: 20 },
      { value: 80, percent: 12.5 },
      { value: 4321.09, percent: 7 },
    ];
    for (const c of cases) {
      const up = ok(calculateIncrease(c));
      const back = ok(
        findOriginalBeforeIncrease({ final: up.result, percent: c.percent }),
      );
      expect(Math.abs(back.original - c.value)).toBeLessThanOrEqual(0.01);
    }
  });

  it("percentOf then whatPercent recovers the percent (round trip)", () => {
    const cases = [
      { percent: 20, value: 1500 },
      { percent: 12.5, value: 80 },
      { percent: 7, value: 3 },
    ];
    for (const c of cases) {
      const part = ok(calculatePercentOf(c)).result;
      const back = ok(findWhatPercent({ part, whole: c.value }));
      expect(Math.abs(back.percent - c.percent)).toBeLessThanOrEqual(0.01);
    }
  });

  it("percent change direction always matches the sign", () => {
    const up = ok(calculatePercentChange({ from: 100, to: 137 }));
    expect(up.direction).toBe("increase");
    expect(up.percent).toBeGreaterThan(0);

    const down = ok(calculatePercentChange({ from: 137, to: 100 }));
    expect(down.direction).toBe("decrease");
    expect(down.percent).toBeLessThan(0);
  });
});
