import { describe, expect, it } from "vitest";
import {
  calculateCostPrice,
  calculateProfitLoss,
  calculateSellingPrice,
  rateBasisLabel,
  RATE_BASIS_OPTIONS,
} from "../profit-loss-calculator";

// ════════════════════════════════════════════════════════════
// Mode A: Profit or Loss
// ════════════════════════════════════════════════════════════

describe("calculateProfitLoss", () => {
  it("computes a profit with markup-on-cost and margin-on-revenue rates", () => {
    const r = calculateProfitLoss({ costPrice: 800, sellingPrice: 1000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.profitAmount).toBe(200);
    expect(r.data.outcome).toBe("profit");
    expect(r.data.profitPercent).toBe(25); // 200 ÷ 800
    expect(r.data.marginPercent).toBe(20); // 200 ÷ 1000
  });

  it("computes a loss with signed negative percentages", () => {
    const r = calculateProfitLoss({ costPrice: 1000, sellingPrice: 800 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.profitAmount).toBe(-200);
    expect(r.data.outcome).toBe("loss");
    expect(r.data.profitPercent).toBe(-20);
    expect(r.data.marginPercent).toBe(-25);
  });

  it("flags break-even when selling price equals cost price", () => {
    const r = calculateProfitLoss({ costPrice: 500, sellingPrice: 500 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.profitAmount).toBe(0);
    expect(r.data.outcome).toBe("break-even");
    expect(r.data.profitPercent).toBe(0);
    expect(r.data.marginPercent).toBe(0);
  });

  it("derives percentages from rounded money: 333.33 → 999.99", () => {
    // profit 666.66 = 333.33 × 2 exactly → on cost = 200; on revenue = 66.6673… → 66.67
    const r = calculateProfitLoss({ costPrice: 333.33, sellingPrice: 999.99 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.profitAmount).toBe(666.66);
    expect(r.data.profitPercent).toBe(200);
    expect(r.data.marginPercent).toBe(66.67);
  });

  it("rejects a missing or invalid cost price", () => {
    const nan = calculateProfitLoss({ costPrice: Number.NaN, sellingPrice: 1000 });
    expect(nan.ok).toBe(false);
    if (nan.ok) return;
    expect(nan.error).toBe("Cost price must be a valid number");
    expect(nan.fieldErrors).toHaveProperty("costPrice");

    const zero = calculateProfitLoss({ costPrice: 0, sellingPrice: 1000 });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Cost price must be greater than 0");

    const negative = calculateProfitLoss({ costPrice: -1, sellingPrice: 1000 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Cost price must be greater than 0");
  });

  it("rejects a missing or invalid selling price", () => {
    const zero = calculateProfitLoss({ costPrice: 800, sellingPrice: 0 });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Selling price must be greater than 0");
    expect(zero.fieldErrors).toHaveProperty("sellingPrice");

    const negative = calculateProfitLoss({ costPrice: 800, sellingPrice: -5 });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Selling price must be greater than 0");
  });

  it("reports validation errors in input order (cost price first)", () => {
    const r = calculateProfitLoss({ costPrice: 0, sellingPrice: -1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Cost price must be greater than 0");
  });
});

// ════════════════════════════════════════════════════════════
// Mode B: Find Selling Price
// ════════════════════════════════════════════════════════════

describe("calculateSellingPrice", () => {
  it("marks up on cost: ₹1,000 at 20% → ₹1,200", () => {
    const r = calculateSellingPrice({
      costPrice: 1000,
      rate: 20,
      basis: "markup",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sellingPrice).toBe(1200);
    expect(r.data.profitAmount).toBe(200);
    expect(r.data.markupPercent).toBe(20); // recovered exactly
    expect(r.data.marginPercent).toBe(16.67); // 200 ÷ 1,200
  });

  it("applies a margin on revenue: ₹1,000 at 25% margin → ₹1,333.33", () => {
    const r = calculateSellingPrice({
      costPrice: 1000,
      rate: 25,
      basis: "margin",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sellingPrice).toBe(1333.33); // 1,000 ÷ 0.75
    expect(r.data.profitAmount).toBe(333.33);
    expect(r.data.marginPercent).toBe(25); // recovered from rounded money
    expect(r.data.markupPercent).toBe(33.33);
  });

  it("returns the cost price itself at 0%", () => {
    const r = calculateSellingPrice({
      costPrice: 750,
      rate: 0,
      basis: "markup",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sellingPrice).toBe(750);
    expect(r.data.profitAmount).toBe(0);
    expect(r.data.markupPercent).toBe(0);
    expect(r.data.marginPercent).toBe(0);
  });

  it("rounds money half-up: ₹1,999.99 at 15% markup", () => {
    // 1,999.99 × 1.15 = 2,299.9885 → 2,299.99; profit = 300.00
    const r = calculateSellingPrice({
      costPrice: 1999.99,
      rate: 15,
      basis: "markup",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sellingPrice).toBe(2299.99);
    expect(r.data.profitAmount).toBe(300);
    expect(r.data.markupPercent).toBe(15);
  });

  it("rejects a missing or invalid cost price", () => {
    const zero = calculateSellingPrice({ costPrice: 0, rate: 20, basis: "markup" });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Cost price must be greater than 0");
    expect(zero.fieldErrors).toHaveProperty("costPrice");
  });

  it("rejects negative rates on either basis", () => {
    const markup = calculateSellingPrice({
      costPrice: 1000,
      rate: -5,
      basis: "markup",
    });
    expect(markup.ok).toBe(false);
    if (markup.ok) return;
    expect(markup.error).toBe("Markup % cannot be negative");
    expect(markup.fieldErrors).toHaveProperty("rate");

    const margin = calculateSellingPrice({
      costPrice: 1000,
      rate: -5,
      basis: "margin",
    });
    expect(margin.ok).toBe(false);
    if (margin.ok) return;
    expect(margin.error).toBe("Margin % cannot be negative");
  });

  it("allows a 99.99% margin but rejects 100% (division by zero)", () => {
    const ok = calculateSellingPrice({
      costPrice: 1000,
      rate: 99.99,
      basis: "margin",
    });
    expect(ok.ok).toBe(true);

    const fail = calculateSellingPrice({
      costPrice: 1000,
      rate: 100,
      basis: "margin",
    });
    expect(fail.ok).toBe(false);
    if (fail.ok) return;
    expect(fail.error).toBe("Margin % must be less than 100");
  });

  it("rejects a non-numeric rate", () => {
    const r = calculateSellingPrice({
      costPrice: 1000,
      rate: Number.NaN,
      basis: "markup",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Markup % must be a valid number");
  });
});

// ════════════════════════════════════════════════════════════
// Mode C: Find Cost Price
// ════════════════════════════════════════════════════════════

describe("calculateCostPrice", () => {
  it("inverts a markup: ₹1,200 at 20% markup → ₹1,000 cost", () => {
    const r = calculateCostPrice({
      sellingPrice: 1200,
      rate: 20,
      basis: "markup",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.costPrice).toBe(1000); // 1,200 ÷ 1.2
    expect(r.data.profitAmount).toBe(200);
    expect(r.data.markupPercent).toBe(20);
    expect(r.data.marginPercent).toBe(16.67);
  });

  it("inverts a margin: ₹1,333.33 at 25% margin → ₹1,000 cost", () => {
    const r = calculateCostPrice({
      sellingPrice: 1333.33,
      rate: 25,
      basis: "margin",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.costPrice).toBe(1000); // 1,333.33 × 0.75 = 999.9975 → 1,000.00
    expect(r.data.profitAmount).toBe(333.33);
    expect(r.data.marginPercent).toBe(25); // recovered from rounded money
    expect(r.data.markupPercent).toBe(33.33);
  });

  it("returns the selling price itself at 0%", () => {
    const r = calculateCostPrice({ sellingPrice: 600, rate: 0, basis: "margin" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.costPrice).toBe(600);
    expect(r.data.profitAmount).toBe(0);
    expect(r.data.markupPercent).toBe(0);
    expect(r.data.marginPercent).toBe(0);
  });

  it("rejects a missing or invalid selling price", () => {
    const zero = calculateCostPrice({ sellingPrice: 0, rate: 20, basis: "markup" });
    expect(zero.ok).toBe(false);
    if (zero.ok) return;
    expect(zero.error).toBe("Selling price must be greater than 0");
    expect(zero.fieldErrors).toHaveProperty("sellingPrice");

    const negative = calculateCostPrice({
      sellingPrice: -10,
      rate: 20,
      basis: "markup",
    });
    expect(negative.ok).toBe(false);
    if (negative.ok) return;
    expect(negative.error).toBe("Selling price must be greater than 0");
  });

  it("applies the same rate guards as the selling-price mode", () => {
    const margin = calculateCostPrice({
      sellingPrice: 1200,
      rate: -5,
      basis: "margin",
    });
    expect(margin.ok).toBe(false);
    if (margin.ok) return;
    expect(margin.error).toBe("Margin % cannot be negative");

    const hundred = calculateCostPrice({
      sellingPrice: 1200,
      rate: 100,
      basis: "margin",
    });
    expect(hundred.ok).toBe(false);
    if (hundred.ok) return;
    expect(hundred.error).toBe("Margin % must be less than 100");
  });
});

// ════════════════════════════════════════════════════════════
// Shared vocabulary
// ════════════════════════════════════════════════════════════

describe("rate basis vocabulary", () => {
  it("exposes both options with human labels", () => {
    expect(RATE_BASIS_OPTIONS.map((o) => o.value)).toEqual(["markup", "margin"]);
    expect(rateBasisLabel("markup")).toBe("Markup on cost");
    expect(rateBasisLabel("margin")).toBe("Margin on selling price");
  });
});
