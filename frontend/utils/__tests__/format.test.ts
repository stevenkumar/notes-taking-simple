import { describe, expect, it } from "vitest";
import { formatGroupedNumericString } from "../format";

describe("formatGroupedNumericString", () => {
  it("groups small integers unchanged (≤ 3 digits)", () => {
    expect(formatGroupedNumericString("0")).toBe("0");
    expect(formatGroupedNumericString("42")).toBe("42");
    expect(formatGroupedNumericString("999")).toBe("999");
  });

  it("applies Indian grouping: last 3 digits, then twos", () => {
    expect(formatGroupedNumericString("1000")).toBe("1,000");
    expect(formatGroupedNumericString("99999")).toBe("99,999");
    expect(formatGroupedNumericString("100000")).toBe("1,00,000");
    expect(formatGroupedNumericString("1234567")).toBe("12,34,567");
    expect(formatGroupedNumericString("100000000")).toBe("10,00,00,000");
  });

  it("keeps the decimal tail exactly as given (no rounding)", () => {
    expect(formatGroupedNumericString("1234.5")).toBe("1,234.5");
    expect(formatGroupedNumericString("1234567.25")).toBe("12,34,567.25");
    expect(formatGroupedNumericString("0.6666666667")).toBe("0.6666666667");
  });

  it("preserves a trailing decimal point while typing", () => {
    expect(formatGroupedNumericString("12.")).toBe("12.");
    expect(formatGroupedNumericString("1234.")).toBe("1,234.");
  });

  it("preserves the minus sign", () => {
    expect(formatGroupedNumericString("-5")).toBe("-5");
    expect(formatGroupedNumericString("-1234567")).toBe("-12,34,567");
    expect(formatGroupedNumericString("-12.5")).toBe("-12.5");
  });

  it("handles a 12-digit maximum-input string", () => {
    expect(formatGroupedNumericString("999999999999")).toBe(
      "9,99,99,99,99,999",
    );
  });

  it("never parses to a float: 0.1 + 0.2 style tails survive", () => {
    // The engine result string must round-trip byte for byte.
    const raw = "0.3000000000";
    expect(formatGroupedNumericString(raw)).toBe(raw);
  });
});
