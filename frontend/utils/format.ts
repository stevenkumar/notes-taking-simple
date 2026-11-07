/**
 * Number, currency and percentage formatting utilities.
 * Indian currency formatting is the default per PRD §6.11.
 */

const DEFAULT_LOCALE = "en-IN";
const DEFAULT_CURRENCY = "INR";

/** Format a number as currency (INR by default). */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Format a plain number with locale-aware grouping. */
export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 6,
    ...options,
  }).format(value);
}

/** Format a value as a percentage string, e.g. 25.5 → "25.5%". */
export function formatPercentage(
  value: number,
  decimals: number = 2,
): string {
  if (!Number.isFinite(value)) return "—";
  return `${Number(value.toFixed(decimals))}%`;
}

/** Format a large number in compact form, e.g. 1500000 → "15L" / "1.5M". */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Round to a fixed number of decimal places using proper half-up rounding.
 * Avoids floating-point artifacts like 1.005 → 1.00.
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Group an integer part with Indian (en-IN) digit grouping, operating on the
 * RAW string instead of a parsed number so nothing is lost: no float
 * conversion, no rounding, and a trailing "." or leading "-" survives.
 * "1234567.5" → "12,34,567.5", "0.6666666667" → "0.6666666667".
 *
 * Used by the Basic Calculator, which must show the exact digits the user
 * typed or the engine computed (Intl.NumberFormat would re-parse and could
 * round the tail).
 */
export function formatGroupedNumericString(raw: string): string {
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot); // keeps the "."

  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const head = intPart.slice(0, -3);
    const chunks: string[] = [];
    for (let i = head.length; i > 0; i -= 2) {
      chunks.unshift(head.slice(Math.max(0, i - 2), i));
    }
    grouped = `${chunks.join(",")},${last3}`;
  }
  return `${negative ? "-" : ""}${grouped}${fracPart}`;
}

/**
 * Safely parse a user-entered numeric string.
 * Returns null for empty/invalid input.
 */
export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
