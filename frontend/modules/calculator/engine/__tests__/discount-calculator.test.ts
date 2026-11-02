import { describe, expect, it } from "vitest";
import {
  calculateSimpleDiscount,
  calculateFixedDiscount,
  calculateSequentialDiscounts,
  calculateBogo,
  calculateBundleDeal,
  calculateQuantityDiscount,
  calculateTaxAfterDiscount,
  compareOffers,
  calculateBasketBill,
} from "../discount-calculator";

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
// PRD §17 — Required discount test cases
// ════════════════════════════════════════════════════════════

describe("PRD required test cases", () => {
  it("1. ₹2,000 with 20% discount = ₹1,600", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 2000, discountPercent: 20 }));
    expect(r.discountAmount).toBe(400);
    expect(r.finalPrice).toBe(1600);
    expect(r.savings).toBe(400);
  });

  it("2. ₹1,000 with 20% followed by 10% = ₹720 (effective 28%, not 30%)", () => {
    const r = ok(
      calculateSequentialDiscounts({ originalPrice: 1000, discountPercents: [20, 10] }),
    );
    // After first: ₹800, after second: ₹720
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0].priceAfter).toBe(800);
    expect(r.steps[1].priceAfter).toBe(720);
    expect(r.finalPrice).toBe(720);
    expect(r.totalDiscountAmount).toBe(280);
    expect(r.effectiveDiscountPercent).toBe(28);
  });

  it("3. ₹1,000 with flat ₹150 discount = ₹850", () => {
    const r = ok(calculateFixedDiscount({ originalPrice: 1000, discountAmount: 150 }));
    expect(r.finalPrice).toBe(850);
    expect(r.savingsPercent).toBe(15);
  });

  it("4. ₹500 item, quantity 3 = ₹1,500 before discount", () => {
    const r = ok(
      calculateQuantityDiscount({
        unitPrice: 500,
        quantity: 3,
        discountType: "percent",
        discountValue: 0,
      }),
    );
    expect(r.subtotal).toBe(1500);
    expect(r.discountAmount).toBe(0);
    expect(r.finalAmount).toBe(1500);
    expect(r.averagePricePerItem).toBe(500);
  });

  it("5. Buy 2 Get 1 Free with ₹100 per item = ₹200 for 3 items", () => {
    const r = ok(calculateBogo({ itemPrice: 100, buyQuantity: 2, freeQuantity: 1 }));
    expect(r.totalItems).toBe(3);
    expect(r.amountPayable).toBe(200);
    expect(r.effectivePricePerItem).toBeCloseTo(66.67, 2);
    expect(r.effectiveDiscountPercent).toBeCloseTo(33.33, 2);
  });

  it("6. Discount equal to original price = zero payable amount", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 500, discountPercent: 100 }));
    expect(r.finalPrice).toBe(0);
    expect(r.discountAmount).toBe(500);

    const fixed = ok(calculateFixedDiscount({ originalPrice: 500, discountAmount: 500 }));
    expect(fixed.finalPrice).toBe(0);
    expect(fixed.savingsPercent).toBe(100);
  });

  it("7. Discount exceeding original price = validation error", () => {
    expect(
      err(calculateSimpleDiscount({ originalPrice: 500, discountPercent: 150 })),
    ).toContain("cannot exceed 100%");

    expect(
      err(calculateFixedDiscount({ originalPrice: 500, discountAmount: 600 })),
    ).toContain("cannot exceed the original price");
  });

  it("8. Decimal prices and discounts are handled correctly", () => {
    const r = ok(
      calculateSimpleDiscount({ originalPrice: 1999.99, discountPercent: 12.5 }),
    );
    // 1999.99 × 12.5% = 249.99875 → rounds to 250.00 (half-up)
    expect(r.discountAmount).toBe(250);
    expect(r.finalPrice).toBe(1749.99);
    // discount + final must equal original exactly
    expect(r.discountAmount + r.finalPrice).toBe(1999.99);
  });
});

// ════════════════════════════════════════════════════════════
// Mode A — Simple percentage discount
// ════════════════════════════════════════════════════════════

describe("Mode A: simple percentage discount", () => {
  it("computes a typical discount", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 2500, discountPercent: 15 }));
    expect(r.discountAmount).toBe(375);
    expect(r.finalPrice).toBe(2125);
  });

  it("handles zero percent discount", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 999, discountPercent: 0 }));
    expect(r.discountAmount).toBe(0);
    expect(r.finalPrice).toBe(999);
  });

  it("rejects zero, negative and invalid prices", () => {
    expect(err(calculateSimpleDiscount({ originalPrice: 0, discountPercent: 10 }))).toContain(
      "must be greater than 0",
    );
    expect(
      err(calculateSimpleDiscount({ originalPrice: -100, discountPercent: 10 })),
    ).toContain("must be greater than 0");
    expect(
      err(calculateSimpleDiscount({ originalPrice: NaN, discountPercent: 10 })),
    ).toContain("valid number");
  });

  it("rejects negative discount percent", () => {
    expect(
      err(calculateSimpleDiscount({ originalPrice: 100, discountPercent: -5 })),
    ).toContain("cannot be negative");
  });
});

// ════════════════════════════════════════════════════════════
// Mode B — Fixed amount discount
// ════════════════════════════════════════════════════════════

describe("Mode B: fixed amount discount", () => {
  it("computes savings percentage", () => {
    const r = ok(calculateFixedDiscount({ originalPrice: 2000, discountAmount: 400 }));
    expect(r.finalPrice).toBe(1600);
    expect(r.savingsPercent).toBe(20);
  });

  it("rejects negative discount", () => {
    expect(
      err(calculateFixedDiscount({ originalPrice: 100, discountAmount: -10 })),
    ).toContain("cannot be negative");
  });
});

// ════════════════════════════════════════════════════════════
// Mode C — Multiple sequential discounts
// ════════════════════════════════════════════════════════════

describe("Mode C: multiple sequential discounts", () => {
  it("applies discounts to the remaining price, not additively", () => {
    const r = ok(
      calculateSequentialDiscounts({ originalPrice: 2000, discountPercents: [10, 10] }),
    );
    expect(r.steps[0].priceAfter).toBe(1800);
    expect(r.steps[1].priceAfter).toBe(1620);
    expect(r.finalPrice).toBe(1620);
    expect(r.effectiveDiscountPercent).toBe(19); // not 20
  });

  it("supports three discounts", () => {
    const r = ok(
      calculateSequentialDiscounts({ originalPrice: 10000, discountPercents: [50, 10, 10] }),
    );
    expect(r.finalPrice).toBe(4050); // 5000 → 4500 → 4050
    expect(r.totalDiscountAmount).toBe(5950);
    expect(r.effectiveDiscountPercent).toBe(59.5);
  });

  it("requires at least one discount", () => {
    expect(err(calculateSequentialDiscounts({ originalPrice: 1000, discountPercents: [] }))).toContain(
      "at least one discount",
    );
  });

  it("rejects a discount above 100% in any step", () => {
    expect(
      err(
        calculateSequentialDiscounts({ originalPrice: 1000, discountPercents: [50, 101] }),
      ),
    ).toContain("cannot exceed 100%");
  });

  it("rounds each step to paise (billing behaviour)", () => {
    const r = ok(
      calculateSequentialDiscounts({ originalPrice: 999.99, discountPercents: [33.33] }),
    );
    // 999.99 × 33.33% = 333.296667 → rounds to 333.30
    expect(r.steps[0].discountAmount).toBe(333.3);
    expect(r.steps[0].priceAfter).toBe(666.69);
  });
});

// ════════════════════════════════════════════════════════════
// Mode D — BOGO & bundle deals
// ════════════════════════════════════════════════════════════

describe("Mode D: BOGO and bundle", () => {
  it("Buy 1 Get 1 Free halves the effective price", () => {
    const r = ok(calculateBogo({ itemPrice: 50, buyQuantity: 1, freeQuantity: 1 }));
    expect(r.amountPayable).toBe(50);
    expect(r.totalItems).toBe(2);
    expect(r.effectivePricePerItem).toBe(25);
    expect(r.effectiveDiscountPercent).toBe(50);
  });

  it("zero free quantity = normal purchase with 0% discount", () => {
    const r = ok(calculateBogo({ itemPrice: 100, buyQuantity: 3, freeQuantity: 0 }));
    expect(r.amountPayable).toBe(300);
    expect(r.effectiveDiscountPercent).toBe(0);
  });

  it("rejects fractional and zero purchased quantities", () => {
    expect(
      err(calculateBogo({ itemPrice: 100, buyQuantity: 1.5, freeQuantity: 1 })),
    ).toContain("whole number");
    expect(err(calculateBogo({ itemPrice: 100, buyQuantity: 0, freeQuantity: 1 }))).toContain(
      "at least 1",
    );
    expect(
      err(calculateBogo({ itemPrice: 100, buyQuantity: 2, freeQuantity: -1 })),
    ).toContain("at least 0");
  });

  it("bundle deal: 3 items worth ₹300 for ₹250", () => {
    const r = ok(
      calculateBundleDeal({ itemPrice: 100, bundleQuantity: 3, bundlePrice: 250 }),
    );
    expect(r.amountPayable).toBe(250);
    expect(r.effectivePricePerItem).toBeCloseTo(83.33, 2);
    expect(r.effectiveDiscountPercent).toBeCloseTo(16.67, 2);
  });

  it("rejects bundle price above total item value", () => {
    expect(
      err(calculateBundleDeal({ itemPrice: 100, bundleQuantity: 2, bundlePrice: 250 })),
    ).toContain("cannot exceed");
  });
});

// ════════════════════════════════════════════════════════════
// Mode E — Quantity-based shopping
// ════════════════════════════════════════════════════════════

describe("Mode E: quantity-based shopping", () => {
  it("applies percentage discount on the subtotal", () => {
    const r = ok(
      calculateQuantityDiscount({
        unitPrice: 1000,
        quantity: 2,
        discountType: "percent",
        discountValue: 10,
      }),
    );
    expect(r.subtotal).toBe(2000);
    expect(r.discountAmount).toBe(200);
    expect(r.finalAmount).toBe(1800);
    expect(r.averagePricePerItem).toBe(900);
  });

  it("applies fixed discount on the subtotal", () => {
    const r = ok(
      calculateQuantityDiscount({
        unitPrice: 500,
        quantity: 3,
        discountType: "fixed",
        discountValue: 300,
      }),
    );
    expect(r.subtotal).toBe(1500);
    expect(r.discountAmount).toBe(300);
    expect(r.finalAmount).toBe(1200);
  });

  it("rejects fixed discount above subtotal", () => {
    expect(
      err(
        calculateQuantityDiscount({
          unitPrice: 100,
          quantity: 1,
          discountType: "fixed",
          discountValue: 150,
        }),
      ),
    ).toContain("cannot exceed the subtotal");
  });

  it("rejects non-positive quantity", () => {
    expect(
      err(
        calculateQuantityDiscount({
          unitPrice: 100,
          quantity: 0,
          discountType: "percent",
          discountValue: 0,
        }),
      ),
    ).toContain("greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode F — Discount before tax
// ════════════════════════════════════════════════════════════

describe("Mode F: discount before tax", () => {
  it("tax is charged on the discounted price, not the original", () => {
    const r = ok(
      calculateTaxAfterDiscount({ originalPrice: 1000, discountPercent: 10, taxRate: 18 }),
    );
    expect(r.discountAmount).toBe(100);
    expect(r.priceAfterDiscount).toBe(900);
    expect(r.taxAmount).toBe(162); // 18% of 900, NOT 180
    expect(r.finalAmount).toBe(1062);
  });

  it("zero discount and zero tax returns the original price", () => {
    const r = ok(
      calculateTaxAfterDiscount({ originalPrice: 799, discountPercent: 0, taxRate: 0 }),
    );
    expect(r.finalAmount).toBe(799);
    expect(r.taxAmount).toBe(0);
  });

  it("rejects tax rate above 100%", () => {
    expect(
      err(calculateTaxAfterDiscount({ originalPrice: 100, discountPercent: 0, taxRate: 150 })),
    ).toContain("cannot exceed 100%");
  });
});

// ════════════════════════════════════════════════════════════
// Mode G — Compare offers
// ════════════════════════════════════════════════════════════

describe("Mode G: compare offers", () => {
  it("picks the offer with the lowest payable amount (PRD example)", () => {
    // A: ₹2,000 20% off → ₹1,600 | B: ₹2,000 flat ₹350 off → ₹1,650
    const r = ok(
      compareOffers([
        { name: "Product A", originalPrice: 2000, discountType: "percent", discountValue: 20 },
        { name: "Product B", originalPrice: 2000, discountType: "fixed", discountValue: 350 },
      ]),
    );
    expect(r.bestIndex).toBe(0);
    expect(r.offers[0].finalPrice).toBe(1600);
    expect(r.offers[1].finalPrice).toBe(1650);
    expect(r.offers[0].isBest).toBe(true);
    expect(r.offers[1].differenceFromBest).toBe(50);
    expect(r.priceGap).toBe(50);
  });

  it("compares across different MRPs by actual payable amount", () => {
    const r = ok(
      compareOffers([
        { name: "A", originalPrice: 2000, discountType: "percent", discountValue: 20 },
        { name: "B", originalPrice: 1800, discountType: "percent", discountValue: 10 },
      ]),
    );
    // A → 1600, B → 1620: A wins despite lower %
    expect(r.bestIndex).toBe(0);
    expect(r.offers[1].differenceFromBest).toBe(20);
  });

  it("requires at least two offers", () => {
    expect(
      err(compareOffers([{ name: "Only", originalPrice: 100, discountType: "percent", discountValue: 10 }])),
    ).toContain("at least two");
  });

  it("labels offers with empty names automatically", () => {
    const r = ok(
      compareOffers([
        { name: "", originalPrice: 100, discountType: "percent", discountValue: 10 },
        { name: "", originalPrice: 100, discountType: "percent", discountValue: 5 },
      ]),
    );
    expect(r.offers[0].name).toBe("Offer 1");
    expect(r.offers[1].name).toBe("Offer 2");
  });
});

// ════════════════════════════════════════════════════════════
// Mode H — Counter bill estimator
// ════════════════════════════════════════════════════════════

describe("Mode H: counter bill estimator", () => {
  it("totals a mixed basket with discounts and tax", () => {
    const r = ok(
      calculateBasketBill([
        { name: "Pen", mrp: 100, quantity: 3, discountType: "percent", discountValue: 0, taxRate: 0 },
        { name: "Bag", mrp: 500, quantity: 1, discountType: "percent", discountValue: 10, taxRate: 0 },
      ]),
    );
    expect(r.totalMrp).toBe(800);
    expect(r.totalDiscount).toBe(50);
    expect(r.taxableAmount).toBe(750);
    expect(r.estimatedTax).toBe(0);
    expect(r.totalPayable).toBe(750);
    expect(r.totalSavings).toBe(50);
  });

  it("applies tax after discount per line item", () => {
    const r = ok(
      calculateBasketBill([
        { name: "Phone", mrp: 1000, quantity: 1, discountType: "percent", discountValue: 10, taxRate: 18 },
      ]),
    );
    expect(r.items[0].lineTotal).toBe(1000);
    expect(r.items[0].discountAmount).toBe(100);
    expect(r.items[0].priceAfterDiscount).toBe(900);
    expect(r.items[0].taxAmount).toBe(162);
    expect(r.items[0].payable).toBe(1062);
    expect(r.totalPayable).toBe(1062);
    expect(r.estimatedTax).toBe(162);
  });

  it("multiplies MRP by quantity for line totals", () => {
    const r = ok(
      calculateBasketBill([
        { name: "Notebook", mrp: 49.5, quantity: 4, discountType: "fixed", discountValue: 0, taxRate: 0 },
      ]),
    );
    expect(r.totalMrp).toBe(198);
    expect(r.totalPayable).toBe(198);
  });

  it("rejects an empty basket", () => {
    expect(err(calculateBasketBill([]))).toContain("at least one product");
  });

  it("rejects fixed discount above line total with item context", () => {
    const result = calculateBasketBill([
      { name: "Chips", mrp: 50, quantity: 1, discountType: "fixed", discountValue: 60, taxRate: 0 },
    ]);
    expect(err(result)).toContain("Chips");
    expect(err(result)).toContain("line total");
  });

  it("rejects invalid MRP with item context", () => {
    const result = calculateBasketBill([
      { name: "Bad", mrp: 0, quantity: 1, discountType: "percent", discountValue: 0, taxRate: 0 },
    ]);
    expect(err(result)).toContain("MRP");
  });
});

// ════════════════════════════════════════════════════════════
// Cross-cutting: rounding & precision (PRD §14, §17)
// ════════════════════════════════════════════════════════════

describe("rounding and precision", () => {
  it("uses half-up rounding for money", () => {
    const r = ok(calculateFixedDiscount({ originalPrice: 10.01, discountAmount: 0.005 }));
    // 0.005 rounds half-up to 0.01; final = 10.01 − 0.01 = 10.00
    expect(r.discountAmount).toBe(0.01);
    expect(r.finalPrice).toBe(10);
    // Invariant: discount + final = original
    expect(r.discountAmount + r.finalPrice).toBe(10.01);
  });

  it("discount + final always equals original (no leaked paise)", () => {
    const prices = [0.01, 7.77, 123.45, 999999.99, 1999.99];
    for (const price of prices) {
      for (const p of [1, 7.5, 33.33, 50, 99.99, 100]) {
        const r = ok(calculateSimpleDiscount({ originalPrice: price, discountPercent: p }));
        expect(r.discountAmount + r.finalPrice).toBeCloseTo(price, 10);
      }
    }
  });

  it("handles very large amounts without precision loss", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 99999999.99, discountPercent: 15 }));
    expect(r.discountAmount).toBe(15000000);
    expect(r.finalPrice).toBe(84999999.99);
  });

  it("never produces NaN for valid inputs", () => {
    const r = ok(calculateSimpleDiscount({ originalPrice: 0.01, discountPercent: 0.01 }));
    expect(Number.isFinite(r.finalPrice)).toBe(true);
    expect(Number.isFinite(r.discountAmount)).toBe(true);
  });
});
