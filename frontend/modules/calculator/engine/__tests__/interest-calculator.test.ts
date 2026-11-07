import { describe, expect, it } from "vitest";
import {
  calculateCompoundInterest,
  calculateDoublingTime,
  calculateSimpleInterest,
  compoundingLabel,
  COMPOUNDING_OPTIONS,
  type DoublingBasis,
  type PeriodsPerYear,
} from "../interest-calculator";

/** Float-safe 2dp sum for invariant checks (0.1 + 0.2 style artifacts). */
const sum2 = (a: number, b: number) => Number((a + b).toFixed(2));

// ════════════════════════════════════════════════════════════
// Mode A: Simple interest
// ════════════════════════════════════════════════════════════

describe("calculateSimpleInterest", () => {
  it("computes the standard textbook case: 10,000 at 5% for 2 years", () => {
    const r = calculateSimpleInterest({ principal: 10000, annualRate: 5, years: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.interest).toBe(1000);
    expect(r.data.maturity).toBe(11000);
    expect(r.data.principal).toBe(10000);
  });

  it("handles fractional years: 10,000 at 8% for half a year", () => {
    const r = calculateSimpleInterest({ principal: 10000, annualRate: 8, years: 0.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.interest).toBe(400);
    expect(r.data.maturity).toBe(10400);
  });

  it("returns zero interest at 0% (interest-free loan)", () => {
    const r = calculateSimpleInterest({ principal: 5000, annualRate: 0, years: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.interest).toBe(0);
    expect(r.data.maturity).toBe(5000);
  });

  it("rounds money half-up to 2dp: 333.33 at 7.5% for 1.5 years", () => {
    // 333.33 × 7.5 × 1.5 ÷ 100 = 37.499625 → 37.50
    const r = calculateSimpleInterest({ principal: 333.33, annualRate: 7.5, years: 1.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.interest).toBe(37.5);
    expect(r.data.maturity).toBe(370.83);
  });

  it("keeps the invariant principal + interest == maturity", () => {
    const r = calculateSimpleInterest({ principal: 1234.56, annualRate: 6.75, years: 3.25 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sum2(r.data.principal, r.data.interest)).toBe(r.data.maturity);
  });

  it("rejects a non-positive principal", () => {
    expect(calculateSimpleInterest({ principal: 0, annualRate: 5, years: 2 })).toMatchObject({
      ok: false,
      fieldErrors: { principal: expect.stringContaining("greater than 0") },
    });
    expect(
      calculateSimpleInterest({ principal: -100, annualRate: 5, years: 2 }).ok,
    ).toBe(false);
    expect(
      calculateSimpleInterest({ principal: Number.NaN, annualRate: 5, years: 2 }).ok,
    ).toBe(false);
  });

  it("rejects rates outside 0–100", () => {
    expect(
      calculateSimpleInterest({ principal: 1000, annualRate: -1, years: 2 }),
    ).toMatchObject({ ok: false, fieldErrors: { annualRate: expect.stringContaining("negative") } });
    expect(
      calculateSimpleInterest({ principal: 1000, annualRate: 101, years: 2 }),
    ).toMatchObject({ ok: false, fieldErrors: { annualRate: expect.stringContaining("100%") } });
  });

  it("rejects non-positive or absurd times", () => {
    expect(
      calculateSimpleInterest({ principal: 1000, annualRate: 5, years: 0 }),
    ).toMatchObject({ ok: false, fieldErrors: { years: expect.stringContaining("greater than 0") } });
    expect(
      calculateSimpleInterest({ principal: 1000, annualRate: 5, years: -2 }).ok,
    ).toBe(false);
    expect(
      calculateSimpleInterest({ principal: 1000, annualRate: 5, years: 101 }),
    ).toMatchObject({ ok: false, fieldErrors: { years: expect.stringContaining("100 years") } });
  });
});

// ════════════════════════════════════════════════════════════
// Mode B: Compound interest
// ════════════════════════════════════════════════════════════

describe("calculateCompoundInterest", () => {
  it("compounds annually: 10,000 at 10% for 2 years → 12,100", () => {
    const r = calculateCompoundInterest({
      principal: 10000,
      annualRate: 10,
      years: 2,
      periodsPerYear: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(12100);
    expect(r.data.interest).toBe(2100);
    expect(r.data.effectiveRate).toBe(10);
  });

  it("compounds half-yearly: 10,000 at 10% for 1 year → 11,025", () => {
    const r = calculateCompoundInterest({
      principal: 10000,
      annualRate: 10,
      years: 1,
      periodsPerYear: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(11025);
    expect(r.data.interest).toBe(1025);
    expect(r.data.effectiveRate).toBe(10.25);
  });

  it("compounds quarterly: 10,000 at 8% for 1 year → 10,824.32", () => {
    // (1.02)^4 = 1.08243216 exactly
    const r = calculateCompoundInterest({
      principal: 10000,
      annualRate: 8,
      years: 1,
      periodsPerYear: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(10824.32);
    expect(r.data.interest).toBe(824.32);
    expect(r.data.effectiveRate).toBe(8.24);
  });

  it("compounds monthly: 12,000 at 12% for 1 year → 13,521.90", () => {
    const r = calculateCompoundInterest({
      principal: 12000,
      annualRate: 12,
      years: 1,
      periodsPerYear: 12,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(13521.9);
    expect(r.data.interest).toBe(1521.9);
    expect(r.data.effectiveRate).toBe(12.68);
  });

  it("keeps the invariant principal + interest == maturity", () => {
    const r = calculateCompoundInterest({
      principal: 1234.56,
      annualRate: 6.75,
      years: 3.25,
      periodsPerYear: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sum2(r.data.principal, r.data.interest)).toBe(r.data.maturity);
  });

  it("handles fractional years without float drift: 10,000 at 10% for 0.5 years", () => {
    // sqrt(1.1) × 10,000 = 10,488.08848… → 10,488.09
    const r = calculateCompoundInterest({
      principal: 10000,
      annualRate: 10,
      years: 0.5,
      periodsPerYear: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(10488.09);
    expect(r.data.interest).toBe(488.09);
  });

  it("returns principal unchanged at 0%", () => {
    const r = calculateCompoundInterest({
      principal: 5000,
      annualRate: 0,
      years: 3,
      periodsPerYear: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.maturity).toBe(5000);
    expect(r.data.interest).toBe(0);
    expect(r.data.effectiveRate).toBe(0);
  });

  it("annual compounding makes the effective rate equal the nominal rate", () => {
    const r = calculateCompoundInterest({
      principal: 1000,
      annualRate: 8,
      years: 1,
      periodsPerYear: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.effectiveRate).toBe(r.data.annualRate);
  });

  it("rejects an invalid compounding frequency", () => {
    const r = calculateCompoundInterest({
      principal: 1000,
      annualRate: 8,
      years: 1,
      periodsPerYear: 7 as PeriodsPerYear,
    });
    expect(r).toMatchObject({
      ok: false,
      fieldErrors: { periodsPerYear: expect.stringContaining("annually") },
    });
  });

  it("rejects a non-positive principal or time", () => {
    expect(
      calculateCompoundInterest({ principal: 0, annualRate: 8, years: 1, periodsPerYear: 2 }).ok,
    ).toBe(false);
    expect(
      calculateCompoundInterest({ principal: 1000, annualRate: 8, years: 0, periodsPerYear: 2 }).ok,
    ).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// Mode C: Doubling time
// ════════════════════════════════════════════════════════════

/** Growth factor after `years` at `rate` compounded `n` times a year. */
function growthFactor(rate: number, n: number, years: number): number {
  return Math.pow(1 + rate / (100 * n), n * years);
}

describe("calculateDoublingTime", () => {
  it("simple interest doubles at T = 100 ÷ R (10% → 10 years)", () => {
    const r = calculateDoublingTime({ annualRate: 10, basis: "simple" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(10);
    expect(r.data.totalMonths).toBe(120);
    expect(r.data.ruleOf72).toBe(7.2);
  });

  it("simple interest: 25% doubles in exactly 4 years", () => {
    const r = calculateDoublingTime({ annualRate: 25, basis: "simple" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(4);
    expect(r.data.totalMonths).toBe(48);
  });

  it("annual compounding at 100% doubles in exactly 1 year", () => {
    const r = calculateDoublingTime({ annualRate: 100, basis: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(1);
    expect(r.data.totalMonths).toBe(12);
    expect(r.data.ruleOf72).toBe(0.72);
  });

  it("annual compounding at 10% → 7.27 years (Rule of 72 says 7.2)", () => {
    const r = calculateDoublingTime({ annualRate: 10, basis: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(7.27);
    expect(r.data.totalMonths).toBe(87); // ≈ 7 years 3 months
    expect(r.data.ruleOf72).toBe(7.2);
  });

  it("half-yearly compounding at 10% doubles slightly faster: 7.10 years", () => {
    const r = calculateDoublingTime({ annualRate: 10, basis: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).toBe(7.1);
    expect(r.data.years).toBeLessThan(7.27);
  });

  it("the reported years actually double the amount (compound property)", () => {
    for (const basis of [1, 2, 4, 12] as PeriodsPerYear[]) {
      const r = calculateDoublingTime({ annualRate: 10, basis });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const factor = growthFactor(10, basis, r.data.years);
      expect(Math.abs(factor - 2)).toBeLessThan(0.01);
    }
  });

  it("the reported years actually double the amount (simple property)", () => {
    const r = calculateDoublingTime({ annualRate: 7.5, basis: "simple" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1 + R·T/100 should be 2 at the reported (rounded) years.
    const factor = 1 + (7.5 * r.data.years) / 100;
    expect(Math.abs(factor - 2)).toBeLessThan(0.01);
  });

  it("Rule of 72 matches the classic shortcuts (8% → 9, 12% → 6)", () => {
    const at8 = calculateDoublingTime({ annualRate: 8, basis: 1 });
    const at12 = calculateDoublingTime({ annualRate: 12, basis: 1 });
    expect(at8.ok && at8.data.ruleOf72).toBe(9);
    expect(at12.ok && at12.data.ruleOf72).toBe(6);
  });

  it("rejects 0% — money never doubles at a zero rate", () => {
    expect(calculateDoublingTime({ annualRate: 0, basis: 1 })).toMatchObject({
      ok: false,
      fieldErrors: { annualRate: expect.stringContaining("greater than 0") },
    });
  });

  it("rejects negative or over-100 rates and an invalid basis", () => {
    expect(calculateDoublingTime({ annualRate: -5, basis: 1 }).ok).toBe(false);
    expect(calculateDoublingTime({ annualRate: 101, basis: 1 }).ok).toBe(false);
    expect(
      calculateDoublingTime({ annualRate: 10, basis: 7 as DoublingBasis }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { periodsPerYear: expect.stringContaining("annually") },
    });
  });
});

// ════════════════════════════════════════════════════════════
// Shared vocabulary
// ════════════════════════════════════════════════════════════

describe("compounding vocabulary", () => {
  it("COMPOUNDING_OPTIONS covers the four frequencies", () => {
    expect(COMPOUNDING_OPTIONS.map((o) => o.value)).toEqual([1, 2, 4, 12]);
    expect(COMPOUNDING_OPTIONS.map((o) => o.label)).toEqual([
      "Annually",
      "Half-yearly",
      "Quarterly",
      "Monthly",
    ]);
  });

  it("compoundingLabel renders simple interest and each frequency", () => {
    expect(compoundingLabel("simple")).toBe("Simple interest");
    expect(compoundingLabel(1)).toBe("Annually");
    expect(compoundingLabel(2)).toBe("Half-yearly");
    expect(compoundingLabel(4)).toBe("Quarterly");
    expect(compoundingLabel(12)).toBe("Monthly");
  });
});
