"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  COMPOUNDING_OPTIONS,
  INTEREST_RATE_PRESETS,
  TIME_YEAR_PRESETS,
  type DoublingBasis,
  type PeriodsPerYear,
} from "../../engine/interest-calculator";
import type { CompoundForm, DoublingForm, SimpleForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

/** Common rate chips (6–10 % p.a.) shared by all three modes. */
function RateChips({ value, onSelect }: { value: string; onSelect: (rate: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common interest rates">
      {INTEREST_RATE_PRESETS.map((rate) => {
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

/** Time chips (1–10 years). */
function TimeChips({ value, onSelect }: { value: string; onSelect: (years: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common durations">
      {TIME_YEAR_PRESETS.map((years) => {
        const active = value === String(years);
        return (
          <button
            key={years}
            type="button"
            onClick={() => onSelect(String(years))}
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
  );
}

/** Wrap-around radio pills for the compounding frequency. */
function FrequencyPills<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Mode A: Simple interest ──────────────────────────────────

export function SimpleFormView({
  value,
  onChange,
}: {
  value: SimpleForm;
  onChange: (v: SimpleForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Principal amount"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="100000"
        value={value.principal}
        onChange={(e) => onChange({ ...value, principal: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="8"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <div className="space-y-2">
        <Input
          label="Time"
          suffix="years"
          inputMode="decimal"
          autoComplete="off"
          placeholder="5"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
        <TimeChips value={value.time} onSelect={(time) => onChange({ ...value, time })} />
      </div>
      <p className="text-xs text-muted-foreground">
        SI = P × R × T ÷ 100 — interest is paid on the original principal only.
      </p>
    </div>
  );
}

// ── Mode B: Compound interest ────────────────────────────────

export function CompoundFormView({
  value,
  onChange,
}: {
  value: CompoundForm;
  onChange: (v: CompoundForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Principal amount"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="100000"
        value={value.principal}
        onChange={(e) => onChange({ ...value, principal: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="8"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <div className="space-y-2">
        <Input
          label="Time"
          suffix="years"
          inputMode="decimal"
          autoComplete="off"
          placeholder="5"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
        <TimeChips value={value.time} onSelect={(time) => onChange({ ...value, time })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Compounding frequency</p>
        <FrequencyPills
          label="Compounding frequency"
          value={value.periodsPerYear}
          options={COMPOUNDING_OPTIONS}
          onChange={(periodsPerYear) => onChange({ ...value, periodsPerYear })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Interest earns interest — quarterly and monthly compounding grow faster
        than annual for the same rate.
      </p>
    </div>
  );
}

// ── Mode C: Doubling time ────────────────────────────────────

const DOUBLING_BASIS_OPTIONS: Array<{ value: DoublingBasis; label: string }> = [
  { value: "simple", label: "Simple interest" },
  ...COMPOUNDING_OPTIONS,
];

export function DoublingFormView({
  value,
  onChange,
}: {
  value: DoublingForm;
  onChange: (v: DoublingForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          label="Annual interest rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="8"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Growth basis</p>
        <FrequencyPills
          label="Growth basis"
          value={value.basis}
          options={DOUBLING_BASIS_OPTIONS}
          onChange={(basis) => onChange({ ...value, basis })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        How long until your money becomes twice as much — compare the exact
        answer with the Rule of 72 shortcut (72 ÷ rate).
      </p>
    </div>
  );
}
