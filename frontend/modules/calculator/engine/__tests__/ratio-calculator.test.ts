import { describe, expect, it } from "vitest";
import {
  divideInRatio,
  PROPORTION_EXAMPLE_PRESETS,
  RATIO_AMOUNT_PRESETS,
  RATIO_EXAMPLE_PRESETS,
  RATIO_SPLIT_PRESETS,
  simplifyRatio,
  solveProportion,
} from "../ratio-calculator";

/** Float-safe 2dp sum for invariant checks (0.1 + 0.2 style artifacts). */
const sum2 = (a: number, b: number) => Number((a + b).toFixed(2));

// ════════════════════════════════════════════════════════════
// Mode A: Simplify ratio
// ════════════════════════════════════════════════════════════

describe("simplifyRatio", () => {
  it("reduces 4 : 6 to 2 : 3 with GCD 2 and a 40/60 split", () => {
    const r = simplifyRatio({ firstTerm: 4, secondTerm: 6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstTerm).toBe(2);
    expect(r.data.secondTerm).toBe(3);
    expect(r.data.gcd).toBe(2);
    expect(r.data.originalFirst).toBe(4);
    expect(r.data.originalSecond).toBe(6);
    expect(r.data.percentFirst).toBe(40);
    expect(r.data.percentSecond).toBe(60);
  });

  it("reduces 12 : 18 to 2 : 3 with GCD 6", () => {
    const r = simplifyRatio({ firstTerm: 12, secondTerm: 18 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstTerm).toBe(2);
    expect(r.data.secondTerm).toBe(3);
    expect(r.data.gcd).toBe(6);
    expect(r.data.percentFirst).toBe(40);
    expect(r.data.percentSecond).toBe(60);
  });

  it("leaves coprime terms unchanged: 7 : 5 with GCD 1", () => {
    const r = simplifyRatio({ firstTerm: 7, secondTerm: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstTerm).toBe(7);
    expect(r.data.secondTerm).toBe(5);
    expect(r.data.gcd).toBe(1);
    expect(r.data.percentFirst).toBe(58.33); // 7 ÷ 12
    expect(r.data.percentSecond).toBe(41.67); // 100 − 58.33
  });

  it("reduces equal terms to 1 : 1 with an even split", () => {
    const r = simplifyRatio({ firstTerm: 9, secondTerm: 9 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstTerm).toBe(1);
    expect(r.data.secondTerm).toBe(1);
    expect(r.data.gcd).toBe(9);
    expect(r.data.percentFirst).toBe(50);
    expect(r.data.percentSecond).toBe(50);
  });

  it("rounds percentages half-up and keeps them summing to 100: 45 : 60", () => {
    const r = simplifyRatio({ firstTerm: 45, secondTerm: 60 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstTerm).toBe(3); // GCD 15
    expect(r.data.secondTerm).toBe(4);
    expect(r.data.gcd).toBe(15);
    expect(r.data.percentFirst).toBe(42.86); // 3 ÷ 7 = 42.857…
    expect(r.data.percentSecond).toBe(57.14);
    expect(sum2(r.data.percentFirst, r.data.percentSecond)).toBe(100);
  });

  it("rejects a non-numeric term", () => {
    const r = simplifyRatio({ firstTerm: Number.NaN, secondTerm: 6 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be a valid number");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("rejects fractional terms", () => {
    const r = simplifyRatio({ firstTerm: 4.5, secondTerm: 6 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be a whole number");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("rejects zero terms", () => {
    const r = simplifyRatio({ firstTerm: 0, secondTerm: 6 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be greater than 0");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("rejects negative second terms", () => {
    const r = simplifyRatio({ firstTerm: 4, secondTerm: -6 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Second term must be greater than 0");
    expect(r.fieldErrors).toHaveProperty("secondTerm");
  });

  it("reports validation errors in input order (first term first)", () => {
    const r = simplifyRatio({ firstTerm: 0, secondTerm: -6 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode B: Solve proportion
// ════════════════════════════════════════════════════════════

describe("solveProportion", () => {
  it("solves 2 : 3 = 4 : x → 6", () => {
    const r = solveProportion({ firstTerm: 2, secondTerm: 3, thirdTerm: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.solvedTerm).toBe(6); // 3 × 4 ÷ 2
  });

  it("solves 1 : 2 = 5 : x → 10", () => {
    const r = solveProportion({ firstTerm: 1, secondTerm: 2, thirdTerm: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.solvedTerm).toBe(10);
  });

  it("returns a fractional missing term: 2 : 3 = 1 : x → 1.5", () => {
    const r = solveProportion({ firstTerm: 2, secondTerm: 3, thirdTerm: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.solvedTerm).toBe(1.5);
  });

  it("rounds a repeating result half-up: 3 : 5 = 7 : x → 11.67", () => {
    const r = solveProportion({ firstTerm: 3, secondTerm: 5, thirdTerm: 7 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.solvedTerm).toBe(11.67); // 35 ÷ 3 = 11.666…
  });

  it("rejects a zero first term (it would divide by zero)", () => {
    const r = solveProportion({ firstTerm: 0, secondTerm: 3, thirdTerm: 4 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be greater than 0");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("rejects fractional ratio terms", () => {
    const r = solveProportion({ firstTerm: 2, secondTerm: 2.5, thirdTerm: 4 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Second term must be a whole number");
    expect(r.fieldErrors).toHaveProperty("secondTerm");
  });

  it("rejects a non-numeric third term", () => {
    const r = solveProportion({
      firstTerm: 2,
      secondTerm: 3,
      thirdTerm: Number.NaN,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Third term must be a valid number");
    expect(r.fieldErrors).toHaveProperty("thirdTerm");
  });
});

// ════════════════════════════════════════════════════════════
// Mode C: Divide amount in ratio
// ════════════════════════════════════════════════════════════

describe("divideInRatio", () => {
  it("splits ₹1,000 in 1 : 1 into two equal shares", () => {
    const r = divideInRatio({ amount: 1000, firstTerm: 1, secondTerm: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.totalParts).toBe(2);
    expect(r.data.firstShare).toBe(500);
    expect(r.data.secondShare).toBe(500);
    expect(r.data.percentFirst).toBe(50);
    expect(r.data.percentSecond).toBe(50);
  });

  it("splits ₹1,000 in 2 : 3 into 400 and 600", () => {
    const r = divideInRatio({ amount: 1000, firstTerm: 2, secondTerm: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.totalParts).toBe(5);
    expect(r.data.firstShare).toBe(400);
    expect(r.data.secondShare).toBe(600);
    expect(r.data.percentFirst).toBe(40);
    expect(r.data.percentSecond).toBe(60);
  });

  it("keeps the exact-sum invariant after rounding: ₹100.01 in 1 : 2", () => {
    // 100.01 × 1/3 = 33.3366… → 33.34; second share is the complement
    const r = divideInRatio({ amount: 100.01, firstTerm: 1, secondTerm: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstShare).toBe(33.34);
    expect(r.data.secondShare).toBe(66.67);
    expect(sum2(r.data.firstShare, r.data.secondShare)).toBe(100.01);
    expect(r.data.percentFirst).toBe(33.33);
    expect(r.data.percentSecond).toBe(66.67);
  });

  it("handles an amount smaller than one rupee: ₹0.01 in 3 : 2", () => {
    const r = divideInRatio({ amount: 0.01, firstTerm: 3, secondTerm: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.firstShare).toBe(0.01); // 0.006 → 0.01
    expect(r.data.secondShare).toBe(0); // complement keeps the sum exact
    expect(sum2(r.data.firstShare, r.data.secondShare)).toBe(0.01);
    expect(r.data.percentFirst).toBe(60);
    expect(r.data.percentSecond).toBe(40);
  });

  it("rounds the amount half-up before splitting", () => {
    // 99.999 → 100.00, then split 1 : 1 → 50 / 50
    const r = divideInRatio({ amount: 99.999, firstTerm: 1, secondTerm: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.amount).toBe(100);
    expect(r.data.firstShare).toBe(50);
    expect(r.data.secondShare).toBe(50);
  });

  it("rejects a missing or invalid amount", () => {
    const nan = divideInRatio({ amount: Number.NaN, firstTerm: 1, secondTerm: 1 });
    expect(nan.ok).toBe(false);
    if (nan.ok) return;
    expect(nan.error).toBe("Amount must be a valid number");
    expect(nan.fieldErrors).toHaveProperty("amount");

    const zero = divideInRatio({ amount: 0, firstTerm: 1, secondTerm: 1 });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Amount must be greater than 0");

    const negative = divideInRatio({ amount: -100, firstTerm: 1, secondTerm: 1 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Amount must be greater than 0");
  });

  it("rejects a zero ratio term", () => {
    const r = divideInRatio({ amount: 1000, firstTerm: 0, secondTerm: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be greater than 0");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("rejects a fractional ratio term", () => {
    const r = divideInRatio({ amount: 1000, firstTerm: 1.5, secondTerm: 2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("First term must be a whole number");
    expect(r.fieldErrors).toHaveProperty("firstTerm");
  });

  it("validates the amount before the ratio terms", () => {
    const r = divideInRatio({ amount: -1, firstTerm: 0, secondTerm: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Amount must be greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Shared presets
// ════════════════════════════════════════════════════════════

describe("ratio presets", () => {
  it("expose sensible examples for every mode", () => {
    expect(RATIO_EXAMPLE_PRESETS).toHaveLength(3);
    expect(RATIO_EXAMPLE_PRESETS[0]).toEqual({ firstTerm: 4, secondTerm: 6 });
    expect(PROPORTION_EXAMPLE_PRESETS).toHaveLength(3);
    expect(PROPORTION_EXAMPLE_PRESETS[0]).toEqual({
      firstTerm: 2,
      secondTerm: 3,
      thirdTerm: 4,
    });
    expect(RATIO_SPLIT_PRESETS.map((p) => `${p.firstTerm}:${p.secondTerm}`)).toEqual([
      "1:1",
      "2:1",
      "3:2",
    ]);
    expect(RATIO_AMOUNT_PRESETS).toEqual([1000, 5000, 10000]);
  });
});
