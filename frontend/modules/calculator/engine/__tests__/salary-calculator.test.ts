import { describe, expect, it } from "vitest";
import {
  calculateSalaryFromCtc,
  calculateSalaryFromGross,
  SALARY_DEFAULTS,
} from "../salary-calculator";

// ════════════════════════════════════════════════════════════
// Mode A: CTC → Take-home
// ════════════════════════════════════════════════════════════

describe("calculateSalaryFromCtc", () => {
  const base = {
    annualCtc: 1200000,
    basicPercent: 40,
    pfPercent: 12,
    professionalTaxMonthly: 200,
    otherDeductionsMonthly: 0,
  };

  it("computes the standard case: ₹12L CTC, 40% basic, 12% PF, ₹200 PT", () => {
    const r = calculateSalaryFromCtc(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 12,00,000 × 40% = 4,80,000 basic; PF 12% = 57,600 each side
    expect(r.data.annualBasic).toBe(480000);
    expect(r.data.employerPfAnnual).toBe(57600);
    expect(r.data.grossAnnual).toBe(1142400); // CTC − employer PF
    expect(r.data.employeePfAnnual).toBe(57600);
    expect(r.data.ptAnnual).toBe(2400); // 200 × 12
    expect(r.data.totalDeductionsAnnual).toBe(60000);
    expect(r.data.inHandAnnual).toBe(1082400);
    expect(r.data.monthlyGross).toBe(95200);
    expect(r.data.monthlyInHand).toBe(90200);
    expect(r.data.deductionPercent).toBe(9.8); // 1,17,600 ÷ 12,00,000
  });

  it("subtracts other monthly deductions from take-home", () => {
    const r = calculateSalaryFromCtc({ ...base, otherDeductionsMonthly: 5000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.otherAnnual).toBe(60000);
    expect(r.data.totalDeductionsAnnual).toBe(120000); // 57,600 + 2,400 + 60,000
    expect(r.data.inHandAnnual).toBe(1022400);
    expect(r.data.monthlyInHand).toBe(85200);
    expect(r.data.deductionPercent).toBe(14.8);
  });

  it("rounds money half-up at each step: 9,99,999.99 at 40% basic", () => {
    // 9,99,999.99 × 40% = 3,99,999.996 → 4,00,000.00
    const r = calculateSalaryFromCtc({ ...base, annualCtc: 999999.99 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.annualBasic).toBe(400000);
    expect(r.data.employerPfAnnual).toBe(48000); // 4,00,000 × 12%
    expect(r.data.grossAnnual).toBe(951999.99);
    expect(r.data.inHandAnnual).toBe(901599.99); // 9,51,999.99 − 50,400
    expect(r.data.monthlyInHand).toBe(75133.33); // 9,01,599.99 ÷ 12
    expect(r.data.deductionPercent).toBe(9.84);
  });

  it("handles 0% basic: no PF, gross equals CTC", () => {
    const r = calculateSalaryFromCtc({ ...base, basicPercent: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.annualBasic).toBe(0);
    expect(r.data.employerPfAnnual).toBe(0);
    expect(r.data.grossAnnual).toBe(1200000);
    expect(r.data.employeePfAnnual).toBe(0);
    expect(r.data.totalDeductionsAnnual).toBe(2400);
    expect(r.data.inHandAnnual).toBe(1197600);
    expect(r.data.monthlyInHand).toBe(99800);
  });

  it("handles 0% PF: only professional tax and other deductions apply", () => {
    const r = calculateSalaryFromCtc({ ...base, pfPercent: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.employerPfAnnual).toBe(0);
    expect(r.data.grossAnnual).toBe(1200000);
    expect(r.data.employeePfAnnual).toBe(0);
    expect(r.data.inHandAnnual).toBe(1197600);
    expect(r.data.deductionPercent).toBe(0.2); // 2,400 ÷ 12,00,000
  });

  it("rejects a missing or invalid CTC", () => {
    const nan = calculateSalaryFromCtc({ ...base, annualCtc: Number.NaN });
    expect(nan.ok).toBe(false);
    if (nan.ok) return;
    expect(nan.error).toBe("Annual CTC must be a valid number");
    expect(nan.fieldErrors).toHaveProperty("annualCtc");

    const zero = calculateSalaryFromCtc({ ...base, annualCtc: 0 });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Annual CTC must be greater than 0");

    const negative = calculateSalaryFromCtc({ ...base, annualCtc: -5000 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Annual CTC must be greater than 0");
  });

  it("rejects basic % outside 0–100", () => {
    const high = calculateSalaryFromCtc({ ...base, basicPercent: 101 });
    expect(high.ok).toBe(false);
    if (high.ok) return;
    expect(high.error).toBe("Basic % must be between 0 and 100");
    expect(high.fieldErrors).toHaveProperty("basicPercent");

    const low = calculateSalaryFromCtc({ ...base, basicPercent: -1 });
    expect(low.ok).toBe(false);
    if (low.ok) return;
    expect(low.error).toBe("Basic % cannot be negative");
  });

  it("rejects PF % above 100", () => {
    const r = calculateSalaryFromCtc({ ...base, pfPercent: 150 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("PF % must be between 0 and 100");
    expect(r.fieldErrors).toHaveProperty("pfPercent");
  });

  it("rejects negative professional tax and other deductions", () => {
    const pt = calculateSalaryFromCtc({ ...base, professionalTaxMonthly: -1 });
    expect(pt.ok).toBe(false);
    if (pt.ok) return;
    expect(pt.error).toBe("Professional tax cannot be negative");
    expect(pt.fieldErrors).toHaveProperty("professionalTaxMonthly");

    const other = calculateSalaryFromCtc({ ...base, otherDeductionsMonthly: -0.01 });
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.error).toBe("Other deductions cannot be negative");
  });

  it("errors when deductions push take-home below zero", () => {
    // CTC 10,000 with 100% basic and 100% PF: gross = 0, PF = 10,000 + PT
    const r = calculateSalaryFromCtc({
      annualCtc: 10000,
      basicPercent: 100,
      pfPercent: 100,
      professionalTaxMonthly: 200,
      otherDeductionsMonthly: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Deductions exceed your gross salary");
  });

  it("reports validation errors in input order (CTC first)", () => {
    const r = calculateSalaryFromCtc({ ...base, annualCtc: 0, basicPercent: 101 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Annual CTC must be greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode B: Monthly gross → Take-home
// ════════════════════════════════════════════════════════════

describe("calculateSalaryFromGross", () => {
  const base = {
    monthlyGross: 50000,
    basicPercent: 40,
    pfPercent: 12,
    professionalTaxMonthly: 200,
    otherDeductionsMonthly: 0,
  };

  it("computes the standard case: ₹50,000 gross, 40% basic, 12% PF", () => {
    const r = calculateSalaryFromGross(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.monthlyBasic).toBe(20000); // 50,000 × 40%
    expect(r.data.employeePfMonthly).toBe(2400); // 20,000 × 12%
    expect(r.data.totalDeductionsMonthly).toBe(2600); // + 200 PT
    expect(r.data.monthlyInHand).toBe(47400);
    expect(r.data.annualGross).toBe(600000);
    expect(r.data.annualDeductions).toBe(31200);
    expect(r.data.annualInHand).toBe(568800);
    expect(r.data.deductionPercent).toBe(5.2); // 2,600 ÷ 50,000
  });

  it("keeps the exact invariant annualInHand = monthlyInHand × 12 after rounding", () => {
    // 33,333.33 × 40% = 13,333.332 → 13,333.33; PF 12% = 1,599.9996 → 1,600.00
    const r = calculateSalaryFromGross({ ...base, monthlyGross: 33333.33 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.monthlyBasic).toBe(13333.33);
    expect(r.data.employeePfMonthly).toBe(1600);
    expect(r.data.monthlyInHand).toBe(31533.33); // − 1,800 deductions
    expect(r.data.annualInHand).toBe(378399.96); // 31,533.33 × 12 exactly
    expect(r.data.annualInHand).toBe(
      Number((r.data.monthlyInHand * 12).toFixed(2)),
    );
    expect(r.data.deductionPercent).toBe(5.4);
  });

  it("handles 0% PF: gross minus tax and other deductions only", () => {
    const r = calculateSalaryFromGross({ ...base, pfPercent: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.employeePfMonthly).toBe(0);
    expect(r.data.monthlyInHand).toBe(49800);
    expect(r.data.annualInHand).toBe(597600);
    expect(r.data.deductionPercent).toBe(0.4); // 200 ÷ 50,000
  });

  it("rejects a missing or invalid monthly gross", () => {
    const nan = calculateSalaryFromGross({ ...base, monthlyGross: Number.NaN });
    expect(nan.ok).toBe(false);
    if (nan.ok) return;
    expect(nan.error).toBe("Monthly gross salary must be a valid number");
    expect(nan.fieldErrors).toHaveProperty("monthlyGross");

    const zero = calculateSalaryFromGross({ ...base, monthlyGross: 0 });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Monthly gross salary must be greater than 0");

    const negative = calculateSalaryFromGross({ ...base, monthlyGross: -1 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Monthly gross salary must be greater than 0");
  });

  it("rejects percentages and deductions outside their ranges", () => {
    const basic = calculateSalaryFromGross({ ...base, basicPercent: 101 });
    expect(basic.ok).toBe(false);
    if (basic.ok) return;
    expect(basic.error).toBe("Basic % must be between 0 and 100");

    const pf = calculateSalaryFromGross({ ...base, pfPercent: -5 });
    expect(pf.ok).toBe(false);
    if (pf.ok) return;
    expect(pf.error).toBe("PF % cannot be negative");

    const pt = calculateSalaryFromGross({ ...base, professionalTaxMonthly: -1 });
    expect(pt.ok).toBe(false);
    if (pt.ok) return;
    expect(pt.error).toBe("Professional tax cannot be negative");

    const other = calculateSalaryFromGross({ ...base, otherDeductionsMonthly: -10 });
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.error).toBe("Other deductions cannot be negative");
  });

  it("errors when deductions push take-home below zero", () => {
    const r = calculateSalaryFromGross({
      monthlyGross: 1000,
      basicPercent: 100,
      pfPercent: 100,
      professionalTaxMonthly: 500,
      otherDeductionsMonthly: 500,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Deductions exceed your gross salary");
  });
});

// ════════════════════════════════════════════════════════════
// Shared defaults
// ════════════════════════════════════════════════════════════

describe("SALARY_DEFAULTS", () => {
  it("produce a valid result in both modes without extra input", () => {
    const a = calculateSalaryFromCtc({ annualCtc: 1000000, ...SALARY_DEFAULTS });
    expect(a.ok).toBe(true);

    const b = calculateSalaryFromGross({ monthlyGross: 50000, ...SALARY_DEFAULTS });
    expect(b.ok).toBe(true);
  });
});
