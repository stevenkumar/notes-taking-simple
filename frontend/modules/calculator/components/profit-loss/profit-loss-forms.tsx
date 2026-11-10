"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  PROFIT_RATE_PRESETS,
  RATE_BASIS_OPTIONS,
  type RateBasis,
} from "../../engine/profit-loss-calculator";
import type { CostForm, OutcomeForm, SellingForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

/** Common profit-rate chips (10–50 %) shared by the rate modes. */
function RateChips({ value, onSelect }: { value: string; onSelect: (rate: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common profit rates">
      {PROFIT_RATE_PRESETS.map((rate) => {
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

/** Radio pills choosing which base the rate applies to. */
function BasisPills({
  value,
  onChange,
}: {
  value: RateBasis;
  onChange: (basis: RateBasis) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rate basis" className="flex flex-wrap gap-1.5">
      {RATE_BASIS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
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

// ── Mode A: Profit or Loss ───────────────────────────────────

export function OutcomeFormView({
  value,
  onChange,
}: {
  value: OutcomeForm;
  onChange: (v: OutcomeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Cost price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="800"
        value={value.costPrice}
        onChange={(e) => onChange({ ...value, costPrice: e.target.value })}
      />
      <Input
        label="Selling price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1000"
        value={value.sellingPrice}
        onChange={(e) => onChange({ ...value, sellingPrice: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Selling price above cost is a profit, below is a loss, equal is
        break-even. Markup % is on cost; margin % is on selling price.
      </p>
    </div>
  );
}

// ── Mode B: Find Selling Price ───────────────────────────────

export function SellingFormView({
  value,
  onChange,
}: {
  value: SellingForm;
  onChange: (v: SellingForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Cost price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1000"
        value={value.costPrice}
        onChange={(e) => onChange({ ...value, costPrice: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Profit rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="20"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Apply rate as</p>
        <BasisPills value={value.basis} onChange={(basis) => onChange({ ...value, basis })} />
      </div>
    </div>
  );
}

// ── Mode C: Find Cost Price ──────────────────────────────────

export function CostFormView({
  value,
  onChange,
}: {
  value: CostForm;
  onChange: (v: CostForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Selling price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1200"
        value={value.sellingPrice}
        onChange={(e) => onChange({ ...value, sellingPrice: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Profit rate"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="20"
          value={value.rate}
          onChange={(e) => onChange({ ...value, rate: e.target.value })}
        />
        <RateChips value={value.rate} onSelect={(rate) => onChange({ ...value, rate })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Apply rate as</p>
        <BasisPills value={value.basis} onChange={(basis) => onChange({ ...value, basis })} />
      </div>
    </div>
  );
}
