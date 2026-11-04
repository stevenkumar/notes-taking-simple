"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { EMI_RATE_PRESETS, EMI_TENURE_YEAR_PRESETS } from "../../engine/emi-calculator";
import type { AffordForm, EmiForm, PrepayForm, TenureUnit } from "./types";

// ── Shared controls ──────────────────────────────────────────

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

/** Radio-style toggle (e.g. tenure unit: years vs months). */
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

/** Common interest-rate chips (6.5 / 8.5 / 10 / 12 / 15 % p.a.). */
function RateChips({ value, onSelect }: { value: string; onSelect: (rate: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common interest rates">
      {EMI_RATE_PRESETS.map((rate) => {
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

const TENURE_UNIT_OPTIONS: Array<{ value: TenureUnit; label: string }> = [
  { value: "years", label: "Years" },
  { value: "months", label: "Months" },
];

/** Tenure input + years/months unit toggle + quick chips (years only). */
function TenureField({
  value,
  unit,
  onChange,
}: {
  value: string;
  unit: TenureUnit;
  onChange: (value: string, unit: TenureUnit) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Input
          label="Tenure"
          inputMode="decimal"
          autoComplete="off"
          placeholder={unit === "years" ? "20" : "240"}
          value={value}
          onChange={(e) => onChange(e.target.value, unit)}
          className="flex-1"
        />
        <Segmented
          label="Tenure unit"
          value={unit}
          options={TENURE_UNIT_OPTIONS}
          onChange={(next) => onChange(value, next)}
          className="mb-0.5"
        />
      </div>
      {unit === "years" && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common tenures">
          {EMI_TENURE_YEAR_PRESETS.map((years) => {
            const active = value === String(years);
            return (
              <button
                key={years}
                type="button"
                onClick={() => onChange(String(years), "years")}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {years}y
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Mode A: Find EMI ─────────────────────────────────────────

export function EmiFormView({
  value,
  onChange,
}: {
  value: EmiForm;
  onChange: (v: EmiForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Loan amount"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1000000"
        value={value.principal}
        onChange={(e) => onChange({ ...value, principal: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="9"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <TenureField
        value={value.tenure}
        unit={value.tenureUnit}
        onChange={(tenure, tenureUnit) => onChange({ ...value, tenure, tenureUnit })}
      />
    </div>
  );
}

// ── Mode B: Loan amount (affordability) ──────────────────────

export function AffordFormView({
  value,
  onChange,
}: {
  value: AffordForm;
  onChange: (v: AffordForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Monthly EMI you can pay"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="25000"
        value={value.monthlyEmi}
        onChange={(e) => onChange({ ...value, monthlyEmi: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="9"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <TenureField
        value={value.tenure}
        unit={value.tenureUnit}
        onChange={(tenure, tenureUnit) => onChange({ ...value, tenure, tenureUnit })}
      />
      <p className="text-xs text-muted-foreground">
        Reverse EMI — finds the maximum loan your monthly budget can repay.
      </p>
    </div>
  );
}

// ── Mode C: Prepayment impact ────────────────────────────────

export function PrepayFormView({
  value,
  onChange,
}: {
  value: PrepayForm;
  onChange: (v: PrepayForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Loan amount"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1000000"
          value={value.principal}
          onChange={(e) => onChange({ ...value, principal: e.target.value })}
        />
        <Input
          label="Extra monthly payment"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="5000"
          value={value.extra}
          onChange={(e) => onChange({ ...value, extra: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="9"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <TenureField
        value={value.tenure}
        unit={value.tenureUnit}
        onChange={(tenure, tenureUnit) => onChange({ ...value, tenure, tenureUnit })}
      />
      <p className="text-xs text-muted-foreground">
        See how much extra payment shortens your tenure and saves interest.
      </p>
    </div>
  );
}
