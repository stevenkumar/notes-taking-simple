"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { GST_RATES, type SupplyType } from "../../engine/gst-calculator";
import type { AddForm, FindRateForm, RemoveForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

/** Radio-style toggle for the supply type (intra vs inter state). */
function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-lg border border-border bg-muted p-1", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Standard GST slab chips (0/5/12/18/28) — one tap sets the rate. */
function RateChips({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (rate: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Standard GST rates">
      {GST_RATES.map((rate) => {
        const active = value === String(rate);
        return (
          <button
            key={rate}
            type="button"
            onClick={() => onSelect(String(rate))}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {rate}%
          </button>
        );
      })}
    </div>
  );
}

const SUPPLY_OPTIONS: Array<{ value: SupplyType; label: string }> = [
  { value: "intra", label: "Intra-state" },
  { value: "inter", label: "Inter-state" },
];

// ── Mode A: Add GST ──────────────────────────────────────────

export function AddFormView({
  value,
  onChange,
}: {
  value: AddForm;
  onChange: (v: AddForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount without GST"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1000"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <Input
          label="GST rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="18"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
      </div>

      <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Supply type</p>
        <Segmented
          label="Supply type"
          value={value.supplyType}
          options={SUPPLY_OPTIONS}
          onChange={(supplyType) => onChange({ ...value, supplyType })}
        />
        <p className="text-xs text-muted-foreground">
          Intra-state splits GST into CGST + SGST; inter-state charges full IGST.
        </p>
      </div>
    </div>
  );
}

// ── Mode B: Remove GST ───────────────────────────────────────

export function RemoveFormView({
  value,
  onChange,
}: {
  value: RemoveForm;
  onChange: (v: RemoveForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Total amount (incl. GST)"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1180"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <Input
          label="GST rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="18"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
      </div>

      <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Supply type</p>
        <Segmented
          label="Supply type"
          value={value.supplyType}
          options={SUPPLY_OPTIONS}
          onChange={(supplyType) => onChange({ ...value, supplyType })}
        />
        <p className="text-xs text-muted-foreground">
          Extracts the pre-GST price: total ÷ (1 + rate).
        </p>
      </div>
    </div>
  );
}

// ── Mode C: Find GST rate ────────────────────────────────────

export function FindRateFormView({
  value,
  onChange,
}: {
  value: FindRateForm;
  onChange: (v: FindRateForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount without GST"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1000"
          value={value.baseAmount}
          onChange={(e) => onChange({ ...value, baseAmount: e.target.value })}
        />
        <Input
          label="Total amount (incl. GST)"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1180"
          value={value.totalAmount}
          onChange={(e) => onChange({ ...value, totalAmount: e.target.value })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Enter both amounts to reverse-engineer the effective GST rate.
      </p>
    </div>
  );
}
