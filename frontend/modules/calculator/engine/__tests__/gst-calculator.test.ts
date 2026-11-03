import { describe, expect, it } from "vitest";
import {
  calculateAddGst,
  calculateRemoveGst,
  findGstRate,
  gstSplit,
} from "../gst-calculator";

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
// Mode A — Add GST (exclusive → inclusive)
// ════════════════════════════════════════════════════════════

describe("Mode A: add GST", () => {
  it("adds 18% GST to ₹1,000 → ₹1,180 (PRD example)", () => {
    const r = ok(calculateAddGst({ baseAmount: 1000, gstRate: 18 }));
    expect(r.gstAmount).toBe(180);
    expect(r.totalAmount).toBe(1180);
    expect(r.baseAmount).toBe(1000);
  });

  it("splits GST into CGST + SGST for intra-state supply", () => {
    const r = ok(
      calculateAddGst({ baseAmount: 1000, gstRate: 18, supplyType: "intra" }),
    );
    expect(r.cgst).toBe(90);
    expect(r.sgst).toBe(90);
    expect(r.igst).toBe(0);
    // cgst + sgst must equal gstAmount exactly
    expect(r.cgst + r.sgst).toBe(r.gstAmount);
  });

  it("uses IGST (full amount) for inter-state supply", () => {
    const r = ok(
      calculateAddGst({ baseAmount: 1000, gstRate: 18, supplyType: "inter" }),
    );
    expect(r.igst).toBe(180);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
  });

  it("defaults to intra-state (CGST + SGST)", () => {
    const r = ok(calculateAddGst({ baseAmount: 2500, gstRate: 12 }));
    expect(r.supplyType).toBe("intra");
    expect(r.gstAmount).toBe(300);
    expect(r.cgst).toBe(150);
    expect(r.sgst).toBe(150);
  });

  it("handles standard GST slabs", () => {
    expect(ok(calculateAddGst({ baseAmount: 100, gstRate: 0 })).totalAmount).toBe(100);
    expect(ok(calculateAddGst({ baseAmount: 100, gstRate: 5 })).totalAmount).toBe(105);
    expect(ok(calculateAddGst({ baseAmount: 100, gstRate: 12 })).totalAmount).toBe(112);
    expect(ok(calculateAddGst({ baseAmount: 100, gstRate: 18 })).totalAmount).toBe(118);
    expect(ok(calculateAddGst({ baseAmount: 100, gstRate: 28 })).totalAmount).toBe(128);
  });

  it("handles decimal amounts", () => {
    const r = ok(calculateAddGst({ baseAmount: 999.99, gstRate: 18 }));
    // 999.99 × 18% = 179.9982 → 180.00 (half-up)
    expect(r.gstAmount).toBe(180);
    expect(r.totalAmount).toBe(1179.99);
    expect(r.baseAmount + r.gstAmount).toBe(r.totalAmount);
  });

  it("rounds odd GST amounts so cgst + sgst = gst exactly", () => {
    // 10.05 × 5% = 0.5025 → 0.50; half = 0.25 each
    const r = ok(calculateAddGst({ baseAmount: 10.05, gstRate: 5 }));
    expect(r.gstAmount).toBe(0.5);
    expect(r.cgst + r.sgst).toBe(r.gstAmount);

    // 0.07 × 18% = 0.0126 → 0.01; half = 0.005 → cgst 0.01, sgst 0.00
    const odd = ok(calculateAddGst({ baseAmount: 0.07, gstRate: 18 }));
    expect(odd.gstAmount).toBe(0.01);
    expect(odd.cgst + odd.sgst).toBe(odd.gstAmount);
  });

  it("rejects zero, negative and invalid amounts", () => {
    expect(err(calculateAddGst({ baseAmount: 0, gstRate: 18 }))).toContain(
      "must be greater than 0",
    );
    expect(err(calculateAddGst({ baseAmount: -5, gstRate: 18 }))).toContain(
      "must be greater than 0",
    );
    expect(err(calculateAddGst({ baseAmount: NaN, gstRate: 18 }))).toContain(
      "valid number",
    );
  });

  it("rejects invalid GST rates", () => {
    expect(err(calculateAddGst({ baseAmount: 100, gstRate: -1 }))).toContain(
      "cannot be negative",
    );
    expect(err(calculateAddGst({ baseAmount: 100, gstRate: 150 }))).toContain(
      "cannot exceed 100%",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Mode B — Remove GST (inclusive → exclusive)
// ════════════════════════════════════════════════════════════

describe("Mode B: remove GST", () => {
  it("back-calculates ₹1,180 at 18% → ₹1,000 + ₹180 GST", () => {
    const r = ok(calculateRemoveGst({ totalAmount: 1180, gstRate: 18 }));
    expect(r.baseAmount).toBe(1000);
    expect(r.gstAmount).toBe(180);
    expect(r.totalAmount).toBe(1180);
    // invariant: base + gst = total
    expect(r.baseAmount + r.gstAmount).toBe(r.totalAmount);
  });

  it("round-trips with add GST", () => {
    const added = ok(calculateAddGst({ baseAmount: 2499, gstRate: 12 }));
    const removed = ok(
      calculateRemoveGst({ totalAmount: added.totalAmount, gstRate: 12 }),
    );
    expect(removed.baseAmount).toBe(2499);
    expect(removed.gstAmount).toBe(added.gstAmount);
  });

  it("handles zero rate (total = base)", () => {
    const r = ok(calculateRemoveGst({ totalAmount: 500, gstRate: 0 }));
    expect(r.baseAmount).toBe(500);
    expect(r.gstAmount).toBe(0);
  });

  it("splits into CGST + SGST for intra-state", () => {
    const r = ok(
      calculateRemoveGst({ totalAmount: 1180, gstRate: 18, supplyType: "intra" }),
    );
    expect(r.cgst).toBe(90);
    expect(r.sgst).toBe(90);
    expect(r.cgst + r.sgst).toBe(r.gstAmount);
  });

  it("uses IGST for inter-state", () => {
    const r = ok(
      calculateRemoveGst({ totalAmount: 1180, gstRate: 18, supplyType: "inter" }),
    );
    expect(r.igst).toBe(180);
    expect(r.cgst).toBe(0);
  });

  it("handles non-even divisions without leaking paise", () => {
    // 1062 / 1.18 = 900 exactly; try an awkward one:
    const r = ok(calculateRemoveGst({ totalAmount: 100, gstRate: 5 }));
    // 100 / 1.05 = 95.238095… → 95.24; gst = 4.76
    expect(r.baseAmount).toBe(95.24);
    expect(r.gstAmount).toBe(4.76);
    expect(r.baseAmount + r.gstAmount).toBe(100);
  });

  it("rejects invalid inputs", () => {
    expect(err(calculateRemoveGst({ totalAmount: 0, gstRate: 18 }))).toContain(
      "must be greater than 0",
    );
    expect(err(calculateRemoveGst({ totalAmount: 100, gstRate: -5 }))).toContain(
      "cannot be negative",
    );
    expect(err(calculateRemoveGst({ totalAmount: 100, gstRate: 200 }))).toContain(
      "cannot exceed 100%",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Mode C — Find GST rate
// ════════════════════════════════════════════════════════════

describe("Mode C: find GST rate", () => {
  it("finds 18% from ₹1,000 → ₹1,180", () => {
    const r = ok(findGstRate({ baseAmount: 1000, totalAmount: 1180 }));
    expect(r.gstRate).toBe(18);
    expect(r.gstAmount).toBe(180);
    expect(r.cgst).toBe(90);
    expect(r.sgst).toBe(90);
  });

  it("finds 12% from ₹2,500 → ₹2,800", () => {
    const r = ok(findGstRate({ baseAmount: 2500, totalAmount: 2800 }));
    expect(r.gstRate).toBe(12);
  });

  it("returns 0% when total equals base", () => {
    const r = ok(findGstRate({ baseAmount: 999, totalAmount: 999 }));
    expect(r.gstRate).toBe(0);
    expect(r.gstAmount).toBe(0);
  });

  it("handles fractional rates", () => {
    // 999.99 → 1,149.99: gst 150 → 15.00015% → 15.00
    const r = ok(findGstRate({ baseAmount: 999.99, totalAmount: 1149.99 }));
    expect(r.gstRate).toBe(15);
  });

  it("rejects total below base", () => {
    expect(
      err(findGstRate({ baseAmount: 1000, totalAmount: 900 })),
    ).toContain("cannot be less than");
  });

  it("rejects zero and invalid amounts", () => {
    expect(err(findGstRate({ baseAmount: 0, totalAmount: 100 }))).toContain(
      "must be greater than 0",
    );
    expect(err(findGstRate({ baseAmount: 100, totalAmount: NaN }))).toContain(
      "valid number",
    );
  });
});

// ════════════════════════════════════════════════════════════
// Cross-cutting: split helper + rounding invariants
// ════════════════════════════════════════════════════════════

describe("gstSplit helper", () => {
  it("splits a discount-adjacent amount by rate", () => {
    const r = gstSplit(2000, 18);
    expect(r).not.toBeNull();
    expect(r!.gst).toBe(360);
    expect(r!.cgst).toBe(180);
    expect(r!.sgst).toBe(180);
  });

  it("returns null for invalid inputs", () => {
    expect(gstSplit(100, 150)).toBeNull();
    expect(gstSplit(-1, 18)).toBeNull();
    expect(gstSplit(NaN, 18)).toBeNull();
  });
});

describe("rounding invariants", () => {
  it("base + gst always equals total across a price matrix", () => {
    /** Sum then round to 2dp — sidesteps JS float artifacts like 145.67000000000002. */
    const sum2 = (...values: number[]): number =>
      Number(values.reduce((a, b) => a + b, 0).toFixed(2));

    const prices = [0.01, 7.77, 123.45, 999.99, 1999.99, 999999.99];
    for (const price of prices) {
      for (const rate of [0, 5, 12, 18, 28, 33.33]) {
        const added = ok(calculateAddGst({ baseAmount: price, gstRate: rate }));
        expect(sum2(added.baseAmount, added.gstAmount)).toBe(added.totalAmount);

        const removed = ok(
          calculateRemoveGst({ totalAmount: added.totalAmount, gstRate: rate }),
        );
        expect(sum2(removed.baseAmount, removed.gstAmount)).toBe(removed.totalAmount);
        expect(sum2(removed.cgst, removed.sgst)).toBe(removed.gstAmount);
      }
    }
  });

  it("round-trips add → remove for every slab", () => {
    for (const rate of [0, 5, 12, 18, 28]) {
      const added = ok(calculateAddGst({ baseAmount: 1234.56, gstRate: rate }));
      const removed = ok(
        calculateRemoveGst({ totalAmount: added.totalAmount, gstRate: rate }),
      );
      expect(removed.baseAmount).toBe(1234.56);
    }
  });

  it("never produces NaN for valid inputs", () => {
    const r = ok(calculateAddGst({ baseAmount: 0.01, gstRate: 0.01 }));
    expect(Number.isFinite(r.gstAmount)).toBe(true);
    expect(Number.isFinite(r.totalAmount)).toBe(true);
  });
});
