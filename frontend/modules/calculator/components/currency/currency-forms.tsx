"use client";

import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  CURRENCIES,
  DEFAULT_RATES_AS_OF,
  getCurrency,
  validateRate,
  type CurrencyDef,
} from "../../engine/currency-calculator";
import type { CurrencyForm, RatesState } from "./types";

// ── Unit select (styled like the shared Input) ───────────────

function SelectField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (currencyId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer bg-transparent px-3 text-sm text-foreground focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Conversion form ──────────────────────────────────────────

export function CurrencyFormView({
  value,
  resultValue,
  onChange,
}: {
  value: CurrencyForm;
  /** Rounded result string with symbol, or null while incomplete / on error. */
  resultValue: string | null;
  onChange: (v: CurrencyForm) => void;
}) {
  const from = getCurrency(value.from);
  const to = getCurrency(value.to);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="100"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Result</span>
          <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3">
            <span
              className={cn(
                "w-full truncate text-sm text-foreground",
                resultValue === null && "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {resultValue ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="currency-from"
          label="From"
          value={value.from}
          onChange={(from) => onChange({ ...value, from })}
        />
        <SelectField
          id="currency-to"
          label="To"
          value={value.to}
          onChange={(to) => onChange({ ...value, to })}
        />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onChange({ ...value, from: value.to, to: value.from })}
          aria-label={`Swap currencies (currently ${value.from} and ${value.to})`}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
            "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Swap currencies
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Conversions run entirely on this device using the rate table below —
        no network needed. {from && to ? `${from.id} and ${to.id} are` : "Both"}{" "}
        quoted per 1 USD.
      </p>
    </div>
  );
}

// ── Editable rate table ──────────────────────────────────────

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatEditedAt(ts: number): string {
  const d = new Date(ts);
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date}, ${hh}:${mm}`;
}

export function RateTable({
  ratesState,
  onRateChange,
  onReset,
}: {
  ratesState: RatesState;
  onRateChange: (currencyId: string, raw: string) => void;
  onReset: () => void;
}) {
  const isCustom = ratesState.source === "custom";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={isCustom ? "default" : "secondary"}>
            {isCustom
              ? ratesState.editedAt !== null
                ? `Custom · edited ${formatEditedAt(ratesState.editedAt)}`
                : "Custom rates"
              : `Built-in · ${formatDateIso(DEFAULT_RATES_AS_OF)}`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Rates per 1 USD — editable
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={!isCustom}
          aria-label="Reset rates to the built-in defaults"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Reset to defaults
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {CURRENCIES.map((c: CurrencyDef) => {
          const isBase = c.id === "USD";
          const raw = ratesState.rates[c.id] ?? "";
          const error = isBase ? null : validateRate(raw);
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              >
                {c.symbol}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.id}</p>
              </div>
              {isBase ? (
                <div className="flex items-center gap-2">
                  <span className="w-28 text-right text-sm text-muted-foreground">
                    1 (base)
                  </span>
                  <Badge variant="outline">USD</Badge>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label={`Rate for ${c.name} per 1 USD`}
                    aria-invalid={error !== null}
                    value={raw}
                    onChange={(e) => onRateChange(c.id, e.target.value)}
                    className={cn(
                      "h-9 w-28 rounded-lg border bg-background px-2.5 text-right text-sm text-foreground",
                      "focus:outline-none focus:ring-1",
                      error
                        ? "border-destructive focus:ring-destructive"
                        : "border-input focus:border-ring focus:ring-ring",
                    )}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Built-in values are an indicative snapshot, not live market rates —
        edit any of them to match your bank or exchange provider and the
        badge above flips to “Custom”.
      </p>
    </div>
  );
}
