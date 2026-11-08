import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  CURRENCIES,
  DEFAULT_RATES,
  DEFAULT_RATES_AS_OF,
  convertCurrency,
  formatMoney,
  formatRate,
  getCurrency,
  validateRate,
} from "../currency-calculator";

// ── Registry ─────────────────────────────────────────────────

describe("currency registry", () => {
  it("covers the PRD currency set with symbols and minor units", () => {
    const ids = CURRENCIES.map((c) => c.id);
    for (const id of ["INR", "USD", "EUR", "GBP", "JPY"]) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    for (const c of CURRENCIES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.symbol.length).toBeGreaterThan(0);
      expect([0, 2]).toContain(c.minorUnits);
    }
    expect(getCurrency("JPY")?.minorUnits).toBe(0);
    expect(getCurrency("INR")?.minorUnits).toBe(2);
    expect(getCurrency("XXX")).toBeUndefined();
  });

  it("ships a complete default rate table with USD fixed at 1", () => {
    expect(DEFAULT_RATES.USD).toBe("1");
    for (const c of CURRENCIES) {
      expect(DEFAULT_RATES[c.id], c.id).toBeTruthy();
      expect(Number(DEFAULT_RATES[c.id])).toBeGreaterThan(0);
    }
    expect(DEFAULT_RATES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Formatting ───────────────────────────────────────────────

describe("formatMoney", () => {
  it("keeps fixed decimals for 2dp currencies", () => {
    expect(formatMoney(new Decimal("8850"), 2)).toBe("8850.00");
    expect(formatMoney(new Decimal("11.299435028248587"), 2)).toBe("11.30");
    expect(formatMoney(new Decimal("0"), 2)).toBe("0.00");
  });

  it("renders zero-decimal currencies without a point", () => {
    expect(formatMoney(new Decimal("7600"), 0)).toBe("7600");
    expect(formatMoney(new Decimal("171751.4"), 0)).toBe("171751");
  });

  it("rounds half-up, not banker's rounding", () => {
    // 0.125 → 0.13 (half-even would give 0.12).
    expect(formatMoney(new Decimal("0.125"), 2)).toBe("0.13");
    expect(formatMoney(new Decimal("0.124"), 2)).toBe("0.12");
    expect(formatMoney(new Decimal("0.126"), 2)).toBe("0.13");
  });
});

describe("formatRate", () => {
  it("uses 6 significant digits with trailing zeros stripped", () => {
    expect(formatRate(new Decimal("88.5"))).toBe("88.5");
    expect(formatRate(new Decimal("0.92"))).toBe("0.92");
    expect(formatRate(new Decimal("1380"))).toBe("1380");
    expect(formatRate(new Decimal("1").div("88.5"))).toBe("0.0112994");
    expect(formatRate(new Decimal("0"))).toBe("0");
  });
});

// ── validateRate ─────────────────────────────────────────────

describe("validateRate", () => {
  it("accepts positive finite numbers as strings", () => {
    expect(validateRate("88.5")).toBeNull();
    expect(validateRate(" 0.92 ")).toBeNull();
    expect(validateRate("1")).toBeNull();
  });

  it("rejects empty, non-numeric and non-positive input", () => {
    expect(validateRate("")).toBe("Enter a rate");
    expect(validateRate("   ")).toBe("Enter a rate");
    expect(validateRate("abc")).toBe("Enter a valid number");
    expect(validateRate("NaN")).toBe("Enter a valid number");
    expect(validateRate("0")).toBe("Rate must be greater than 0");
    expect(validateRate("-5")).toBe("Rate must be greater than 0");
  });
});

// ── convertCurrency ──────────────────────────────────────────

describe("convertCurrency — default rates", () => {
  it("converts USD to INR with the money rounding policy", () => {
    const r = convertCurrency({
      amount: 100,
      from: "USD",
      to: "INR",
      rates: DEFAULT_RATES,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toBe("8850.00");
    expect(r.data.rateLine).toBe("1 USD = 88.5 INR");
    expect(r.data.inverseLine).toBe("1 INR = 0.0112994 USD");
    expect(r.data.from.symbol).toBe("$");
    expect(r.data.to.symbol).toBe("₹");
  });

  it("converts INR to USD rounding half-up at 2dp", () => {
    // 1000 / 88.5 = 11.2994350… → 11.30
    const r = convertCurrency({
      amount: 1000,
      from: "INR",
      to: "USD",
      rates: DEFAULT_RATES,
    });
    expect(r.ok && r.data.result).toBe("11.30");
    expect(r.ok && r.data.rateLine).toBe("1 INR = 0.0112994 USD");
  });

  it("uses 0dp for zero-decimal currencies (JPY, KRW)", () => {
    const jpy = convertCurrency({
      amount: 50,
      from: "USD",
      to: "JPY",
      rates: DEFAULT_RATES,
    });
    expect(jpy.ok && jpy.data.result).toBe("7600");

    const krw = convertCurrency({
      amount: 250,
      from: "USD",
      to: "KRW",
      rates: DEFAULT_RATES,
    });
    expect(krw.ok && krw.data.result).toBe("345000");
  });

  it("keeps identity conversions exact for the same currency", () => {
    const r = convertCurrency({
      amount: 100,
      from: "USD",
      to: "USD",
      rates: DEFAULT_RATES,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.result).toBe("100.00");
    expect(r.data.rateLine).toBe("1 USD = 1 USD");
    expect(r.data.inverseLine).toBe("1 USD = 1 USD");
  });

  it("converts through the USD cross rate (GBP → USD)", () => {
    // 12.5 / 0.79 = 15.8227… → 15.82
    const r = convertCurrency({
      amount: 12.5,
      from: "GBP",
      to: "USD",
      rates: DEFAULT_RATES,
    });
    expect(r.ok && r.data.result).toBe("15.82");
    expect(r.ok && r.data.rateLine).toBe("1 GBP = 1.26582 USD");
    expect(r.ok && r.data.inverseLine).toBe("1 USD = 0.79 GBP");
  });

  it("chains two non-USD currencies via the base (EUR → INR)", () => {
    // 99.99 × 88.5 / 0.92 = 9618.60326… → 9618.60
    const r = convertCurrency({
      amount: 99.99,
      from: "EUR",
      to: "INR",
      rates: DEFAULT_RATES,
    });
    expect(r.ok && r.data.result).toBe("9618.60");
    expect(r.ok && r.data.rateLine).toBe("1 EUR = 96.1957 INR");
  });

  it("allows zero amounts", () => {
    const r = convertCurrency({
      amount: 0,
      from: "USD",
      to: "INR",
      rates: DEFAULT_RATES,
    });
    expect(r.ok && r.data.result).toBe("0.00");
  });
});

describe("convertCurrency — edited rates", () => {
  it("uses the user's rate table instead of the defaults", () => {
    const r = convertCurrency({
      amount: 100,
      from: "USD",
      to: "INR",
      rates: { ...DEFAULT_RATES, INR: "90" },
    });
    expect(r.ok && r.data.result).toBe("9000.00");
    expect(r.ok && r.data.rateLine).toBe("1 USD = 90 INR");
    expect(r.ok && r.data.inverseLine).toBe("1 INR = 0.0111111 USD");
  });

  it("rounds half-up at an exact 0.005 boundary (custom rate)", () => {
    // 1 × 0.125 = 0.125 → 0.13 (half-up, not half-even)
    const r = convertCurrency({
      amount: 1,
      from: "USD",
      to: "EUR",
      rates: { ...DEFAULT_RATES, EUR: "0.125" },
    });
    expect(r.ok && r.data.result).toBe("0.13");
  });
});

describe("convertCurrency — validation", () => {
  it("rejects unknown currencies", () => {
    const badFrom = convertCurrency({
      amount: 1,
      from: "XYZ",
      to: "INR",
      rates: DEFAULT_RATES,
    });
    expect(badFrom.ok).toBe(false);
    if (!badFrom.ok) expect(badFrom.fieldErrors?.from).toBeTruthy();

    const badTo = convertCurrency({
      amount: 1,
      from: "USD",
      to: "XYZ",
      rates: DEFAULT_RATES,
    });
    expect(badTo.ok).toBe(false);
    if (!badTo.ok) expect(badTo.fieldErrors?.to).toBeTruthy();
  });

  it("rejects non-finite and negative amounts", () => {
    for (const amount of [NaN, Infinity, -Infinity]) {
      const r = convertCurrency({
        amount,
        from: "USD",
        to: "INR",
        rates: DEFAULT_RATES,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("Enter a valid amount");
    }

    const neg = convertCurrency({
      amount: -10,
      from: "USD",
      to: "INR",
      rates: DEFAULT_RATES,
    });
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.error).toBe("Amount cannot be negative");
  });

  it("rejects missing or unusable rates with a per-field error", () => {
    const missing = convertCurrency({
      amount: 1,
      from: "USD",
      to: "INR",
      rates: { ...DEFAULT_RATES, INR: "" },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error).toBe("Enter a valid rate for INR");
      expect(missing.fieldErrors?.rates).toBeTruthy();
    }

    const zero = convertCurrency({
      amount: 1,
      from: "USD",
      to: "EUR",
      rates: { ...DEFAULT_RATES, EUR: "0" },
    });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.error).toBe("Enter a valid rate for EUR");

    const absent = convertCurrency({
      amount: 1,
      from: "USD",
      to: "SGD",
      rates: { USD: "1" },
    });
    expect(absent.ok).toBe(false);
    if (!absent.ok) expect(absent.error).toBe("Enter a valid rate for SGD");
  });
});
