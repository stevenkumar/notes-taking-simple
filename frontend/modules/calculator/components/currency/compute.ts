/**
 * Turns the raw amount + current rate table into a validated ResultView
 * via the currency engine.
 *
 * The view also carries the freshness note: the built-in snapshot shows
 * its as-of date, edited tables show when the user last changed a rate.
 */

import {
  convertCurrency,
  DEFAULT_RATES_AS_OF,
} from "../../engine/currency-calculator";
import type { ComputeState } from "../shared/result-types";
import type { CurrencyForm, RatesState } from "./types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-11-01" → "1 Nov 2026" (deterministic, no locale involved). */
function formatDateIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Epoch ms → "12 Nov 2026, 14:30" (local time). */
function formatEditedAt(ts: number): string {
  const d = new Date(ts);
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date}, ${hh}:${mm}`;
}

/**
 * Adds thousands separators to an already-rounded money string:
 * "8850.00" → "8,850.00", "345000" → "345,000".
 */
function groupDigits(money: string): string {
  const negative = money.startsWith("-");
  const body = negative ? money.slice(1) : money;
  const [int, frac] = body.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

/** Freshness line shown in the note and the copy text. */
export function ratesFreshness(ratesState: RatesState): string {
  return ratesState.source === "custom"
    ? ratesState.editedAt !== null
      ? `Custom rates · last edited ${formatEditedAt(ratesState.editedAt)}.`
      : "Custom rates."
    : `Built-in indicative rates as of ${formatDateIso(DEFAULT_RATES_AS_OF)} — edit any rate below to match your source.`;
}

export function computeCurrencyResult(
  form: CurrencyForm,
  ratesState: RatesState,
): ComputeState {
  if (!form.amount.trim()) return { state: "incomplete" };

  const amount = Number(form.amount.trim());
  const r = convertCurrency({
    amount,
    from: form.from,
    to: form.to,
    rates: ratesState.rates,
  });
  if (!r.ok) return { state: "error", message: r.error };

  const d = r.data;
  const money = groupDigits(d.result);
  const same = form.from === form.to;
  const freshness = ratesFreshness(ratesState);

  return {
    state: "ok",
    view: {
      headlineLabel: `${form.amount.trim()} ${d.from.id} → ${d.to.id}`,
      headlineValue: `${d.to.symbol}${money}`,
      subLabel: "Rate",
      subValue: d.rateLine,
      rows: [
        {
          label: "Amount",
          value: `${form.amount.trim()} ${d.from.id} — ${d.from.name}`,
        },
        { label: "Exchange rate", value: d.rateLine, emphasis: true },
        {
          label: "Converted",
          value: `${d.to.symbol}${money} ${d.to.id} — ${d.to.name}`,
          emphasis: true,
        },
        { label: "Inverse rate", value: d.inverseLine },
      ],
      note: same
        ? `Same currency — no conversion applied (${freshness})`
        : `${form.amount.trim()} ${d.from.id} = ${d.to.symbol}${money} ${d.to.id}. ${freshness}`,
      copyText: [
        `Currency Converter — ${d.from.id} to ${d.to.id}`,
        `Amount: ${form.amount.trim()} ${d.from.id}`,
        `Rate: ${d.rateLine}`,
        `Result: ${d.result} ${d.to.id}`,
        `Inverse: ${d.inverseLine}`,
        `Rates: ${
          ratesState.source === "custom"
            ? ratesState.editedAt !== null
              ? `custom, edited ${formatEditedAt(ratesState.editedAt)}`
              : "custom"
            : `built-in as of ${DEFAULT_RATES_AS_OF}`
        }`,
      ].join("\n"),
    },
  };
}
