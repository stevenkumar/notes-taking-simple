import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  calculateAffordableLoan,
  calculateEmi,
  calculatePrepaymentImpact,
  summariseByYear,
} from "../emi-calculator";

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

/** Sum then round to 2dp — sidesteps JS float artifacts. */
const sum2 = (...values: number[]): number =>
  Number(values.reduce((a, b) => a + b, 0).toFixed(2));

// ════════════════════════════════════════════════════════════
// Mode A — Find EMI
// ════════════════════════════════════════════════════════════

describe("Mode A: find EMI", () => {
  it("computes ₹10L at 9% for 20 years → EMI ₹8,997.26", () => {
    const r = ok(calculateEmi({ principal: 1000000, annualRate: 9, tenureMonths: 240 }));
    expect(r.emi).toBe(8997.26);
    expect(r.totalInterest).toBe(1159342.12);
    expect(r.totalPayment).toBe(2159342.12);
    expect(r.schedule).toHaveLength(240);
  });

  it("computes ₹5L at 10.5% for 5 years → EMI ₹10,746.95", () => {
    const r = ok(calculateEmi({ principal: 500000, annualRate: 10.5, tenureMonths: 60 }));
    expect(r.emi).toBe(10746.95);
    expect(r.totalInterest).toBe(144816.99);
    expect(r.totalPayment).toBe(644816.99);
  });

  it("computes ₹8L at 8.5% for 3 years → EMI ₹25,254.03", () => {
    const r = ok(calculateEmi({ principal: 800000, annualRate: 8.5, tenureMonths: 36 }));
    expect(r.emi).toBe(25254.03);
    expect(r.totalInterest).toBe(109145.07);
    expect(r.totalPayment).toBe(909145.07);
  });

  it("handles 0% interest (interest-free loan)", () => {
    const r = ok(calculateEmi({ principal: 50000, annualRate: 0, tenureMonths: 24 }));
    // 50000 / 24 = 2083.333… → 2083.33; final instalment clears the paise.
    expect(r.emi).toBe(2083.33);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPayment).toBe(50000);
    expect(r.schedule).toHaveLength(24);
    expect(r.schedule[23].balance).toBe(0);
  });

  it("schedule repays the principal exactly (no leaked paise)", () => {
    for (const [principal, rate, months] of [
      [1000000, 9, 240],
      [500000, 10.5, 60],
      [800000, 8.5, 36],
      [77777.77, 13.5, 48],
      [1, 15, 12],
    ] as const) {
      const r = ok(calculateEmi({ principal, annualRate: rate, tenureMonths: months }));
      const principalSum = sum2(...r.schedule.map((row) => row.principal));
      expect(principalSum).toBe(principal);
      expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
      expect(r.totalPayment).toBe(sum2(principal, r.totalInterest));
    }
  });

  it("first month interest equals principal × monthly rate", () => {
    const r = ok(calculateEmi({ principal: 1000000, annualRate: 9, tenureMonths: 240 }));
    // 1000000 × 9% / 12 = 7500
    expect(r.schedule[0].interest).toBe(7500);
    expect(r.schedule[0].principal).toBe(1497.26);
    expect(r.schedule[0].payment).toBe(8997.26);
  });

  it("rejects invalid inputs", () => {
    expect(err(calculateEmi({ principal: 0, annualRate: 9, tenureMonths: 240 }))).toContain(
      "must be greater than 0",
    );
    expect(err(calculateEmi({ principal: -100, annualRate: 9, tenureMonths: 240 }))).toContain(
      "must be greater than 0",
    );
    expect(err(calculateEmi({ principal: NaN, annualRate: 9, tenureMonths: 240 }))).toContain(
      "valid number",
    );
    expect(err(calculateEmi({ principal: 1000, annualRate: -1, tenureMonths: 240 }))).toContain(
      "cannot be negative",
    );
    expect(err(calculateEmi({ principal: 1000, annualRate: 150, tenureMonths: 240 }))).toContain(
      "cannot exceed 100%",
    );
  });

  it("rejects invalid tenures", () => {
    expect(err(calculateEmi({ principal: 1000, annualRate: 9, tenureMonths: 0 }))).toContain(
      "at least 1 month",
    );
    expect(err(calculateEmi({ principal: 1000, annualRate: 9, tenureMonths: -12 }))).toContain(
      "at least 1 month",
    );
    expect(err(calculateEmi({ principal: 1000, annualRate: 9, tenureMonths: 601 }))).toContain(
      "600 months",
    );
    expect(err(calculateEmi({ principal: 1000, annualRate: 9, tenureMonths: 12.5 }))).toContain(
      "whole number",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Mode B — Loan amount (affordability)
// ════════════════════════════════════════════════════════════

describe("Mode B: affordable loan amount", () => {
  it("₹25,000 EMI at 9% for 20 years → ₹27,78,623.85", () => {
    const r = ok(
      calculateAffordableLoan({ monthlyPayment: 25000, annualRate: 9, tenureMonths: 240 }),
    );
    expect(r.principal).toBe(2778623.85);
    expect(r.totalInterest).toBe(3221376.3);
    expect(r.totalPayment).toBe(6000000.15);
    expect(r.schedule).toHaveLength(240);
    expect(r.schedule[239].balance).toBe(0);
  });

  it("₹15,000 EMI at 8.5% for 10 years → ₹12,09,817.05", () => {
    const r = ok(
      calculateAffordableLoan({ monthlyPayment: 15000, annualRate: 8.5, tenureMonths: 120 }),
    );
    expect(r.principal).toBe(1209817.05);
    expect(r.totalInterest).toBe(590182.97);
    expect(r.totalPayment).toBe(1800000.02);
  });

  it("round-trips with Mode A: same EMI comes back", () => {
    const loan = ok(
      calculateAffordableLoan({ monthlyPayment: 30000, annualRate: 7.5, tenureMonths: 180 }),
    );
    const emi = ok(
      calculateEmi({ principal: loan.principal, annualRate: 7.5, tenureMonths: 180 }),
    );
    // Within a rupee — principal rounding at 2dp can shift the EMI slightly.
    expect(Math.abs(emi.emi - 30000)).toBeLessThan(1);
  });

  it("handles 0% interest (principal = EMI × months)", () => {
    const r = ok(calculateAffordableLoan({ monthlyPayment: 5000, annualRate: 0, tenureMonths: 12 }));
    expect(r.principal).toBe(60000);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPayment).toBe(60000);
  });

  it("rejects invalid inputs", () => {
    expect(
      err(calculateAffordableLoan({ monthlyPayment: 0, annualRate: 9, tenureMonths: 240 })),
    ).toContain("must be greater than 0");
    expect(
      err(calculateAffordableLoan({ monthlyPayment: -5000, annualRate: 9, tenureMonths: 240 })),
    ).toContain("must be greater than 0");
    expect(
      err(calculateAffordableLoan({ monthlyPayment: 25000, annualRate: 200, tenureMonths: 240 })),
    ).toContain("cannot exceed 100%");
    expect(
      err(calculateAffordableLoan({ monthlyPayment: 25000, annualRate: 9, tenureMonths: 0 })),
    ).toContain("at least 1 month");
  });
});

// ════════════════════════════════════════════════════════════
// Mode C — Prepayment impact
// ════════════════════════════════════════════════════════════

describe("Mode C: prepayment impact", () => {
  it("₹10L at 9% for 20y with +₹5,000/mo → tenure cut to 103 months", () => {
    const r = ok(
      calculatePrepaymentImpact({
        principal: 1000000,
        annualRate: 9,
        tenureMonths: 240,
        extraPayment: 5000,
      }),
    );
    expect(r.emi).toBe(8997.26);
    expect(r.newPayment).toBe(13997.26);
    expect(r.newTenureMonths).toBe(103);
    expect(r.monthsSaved).toBe(137);
    expect(r.totalInterest).toBe(1159342.12);
    expect(r.newTotalInterest).toBe(437726.24);
    expect(r.interestSaved).toBe(721615.88);
    expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
  });

  it("₹5L at 10.5% for 5y with +₹2,000/mo → saves ₹29,686.93", () => {
    const r = ok(
      calculatePrepaymentImpact({
        principal: 500000,
        annualRate: 10.5,
        tenureMonths: 60,
        extraPayment: 2000,
      }),
    );
    expect(r.newTenureMonths).toBe(49);
    expect(r.monthsSaved).toBe(11);
    expect(r.newTotalInterest).toBe(115130.06);
    expect(r.interestSaved).toBe(29686.93);
  });

  it("huge extra payment settles in a single instalment", () => {
    const r = ok(
      calculatePrepaymentImpact({
        principal: 100000,
        annualRate: 12,
        tenureMonths: 60,
        extraPayment: 500000,
      }),
    );
    expect(r.newTenureMonths).toBe(1);
    expect(r.monthsSaved).toBe(59);
    // Interest = one month at 1% = 1000
    expect(r.newTotalInterest).toBe(1000);
    expect(r.interestSaved).toBeGreaterThan(0);
  });

  it("always saves both time and interest", () => {
    const r = ok(
      calculatePrepaymentImpact({
        principal: 800000,
        annualRate: 8.5,
        tenureMonths: 120,
        extraPayment: 3000,
      }),
    );
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.newTotalInterest).toBeLessThan(r.totalInterest);
    expect(r.newTenureMonths).toBeLessThan(r.tenureMonths);
    // Σ principal over the new schedule still equals the loan
    const principalSum = sum2(...r.schedule.map((row) => row.principal));
    expect(principalSum).toBe(800000);
  });

  it("rejects invalid inputs", () => {
    expect(
      err(
        calculatePrepaymentImpact({ principal: 0, annualRate: 9, tenureMonths: 240, extraPayment: 5000 }),
      ),
    ).toContain("must be greater than 0");
    expect(
      err(
        calculatePrepaymentImpact({ principal: 100000, annualRate: 9, tenureMonths: 240, extraPayment: 0 }),
      ),
    ).toContain("must be greater than 0");
    expect(
      err(
        calculatePrepaymentImpact({
          principal: 100000,
          annualRate: 9,
          tenureMonths: 240,
          extraPayment: -1000,
        }),
      ),
    ).toContain("must be greater than 0");
    expect(
      err(
        calculatePrepaymentImpact({ principal: 100000, annualRate: 999, tenureMonths: 240, extraPayment: 1 }),
      ),
    ).toContain("cannot exceed 100%");
  });
});

// ════════════════════════════════════════════════════════════
// Schedule primitives
// ════════════════════════════════════════════════════════════

describe("buildSchedule", () => {
  it("returns null when the payment never covers interest", () => {
    // ₹10L at 12% → monthly interest 10,000; payment 5,000 never repays.
    expect(buildSchedule(1000000, 12, 240, 5000)).toBeNull();
  });

  it("returns null for a zero payment", () => {
    expect(buildSchedule(100000, 9, 60, 0)).toBeNull();
  });

  it("settles a short loan in exactly the requested months", () => {
    const rows = buildSchedule(120000, 0, 12, 10000);
    expect(rows).not.toBeNull();
    expect(rows!).toHaveLength(12);
    expect(rows![11].balance).toBe(0);
  });
});

describe("summariseByYear", () => {
  it("aggregates a 20-year schedule into 20 rows", () => {
    const r = ok(calculateEmi({ principal: 1000000, annualRate: 9, tenureMonths: 240 }));
    const years = summariseByYear(r.schedule);
    expect(years).toHaveLength(20);
    expect(years[0].year).toBe(1);
    expect(years[19].year).toBe(20);
    expect(years[19].closingBalance).toBe(0);
    // Year totals across all years = principal + interest
    const totalPrincipal = sum2(...years.map((y) => y.principalPaid));
    const totalInterest = sum2(...years.map((y) => y.interestPaid));
    expect(totalPrincipal).toBe(1000000);
    expect(totalInterest).toBe(r.totalInterest);
  });

  it("handles a partial final year", () => {
    // 29 months → 3 rows, last year has only 5 months of data.
    const r = ok(calculateEmi({ principal: 250000, annualRate: 10, tenureMonths: 29 }));
    const years = summariseByYear(r.schedule);
    expect(years).toHaveLength(3);
    expect(years[2].closingBalance).toBe(0);
    expect(years[2].principalPaid).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════
// Cross-cutting invariants
// ════════════════════════════════════════════════════════════

describe("rounding invariants", () => {
  it("principal is fully repaid and totals add up across a loan matrix", () => {
    const loans = [
      [0.01, 5, 6],
      [77777.77, 13.5, 48],
      [1234567.89, 9.1, 360],
      [500000, 0, 60],
      [999999.99, 15, 12],
    ] as const;
    for (const [principal, rate, months] of loans) {
      const r = ok(calculateEmi({ principal, annualRate: rate, tenureMonths: months }));
      const principalSum = sum2(...r.schedule.map((row) => row.principal));
      expect(principalSum).toBe(principal);
      expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
      expect(r.totalPayment).toBe(sum2(principal, r.totalInterest));
      // Every row's payment = principal + interest (2dp)
      for (const row of r.schedule) {
        expect(sum2(row.principal, row.interest)).toBe(row.payment);
      }
    }
  });

  it("never produces NaN or Infinity for valid inputs", () => {
    const r = ok(calculateEmi({ principal: 0.01, annualRate: 0.01, tenureMonths: 600 }));
    expect(Number.isFinite(r.emi)).toBe(true);
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(Number.isFinite(r.totalPayment)).toBe(true);
    for (const row of r.schedule) {
      expect(Number.isFinite(row.balance)).toBe(true);
    }
  });

  it("longer tenure always means lower EMI (same principal and rate)", () => {
    const short = ok(calculateEmi({ principal: 1000000, annualRate: 9, tenureMonths: 60 }));
    const long = ok(calculateEmi({ principal: 1000000, annualRate: 9, tenureMonths: 240 }));
    expect(long.emi).toBeLessThan(short.emi);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });
});
