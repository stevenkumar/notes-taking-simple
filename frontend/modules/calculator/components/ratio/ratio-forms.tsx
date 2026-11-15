"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  PROPORTION_EXAMPLE_PRESETS,
  RATIO_AMOUNT_PRESETS,
  RATIO_EXAMPLE_PRESETS,
  RATIO_SPLIT_PRESETS,
} from "../../engine/ratio-calculator";
import type { DivideForm, ProportionForm, SimplifyForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

/** ":" / "=" separator between ratio term inputs. */
function TermSeparator({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 self-end pb-1.5 text-lg font-medium text-muted-foreground"
    >
      {children}
    </span>
  );
}

/** Chip that fills a whole example (both or all three terms). */
function ExampleChip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ── Mode A: Simplify ratio ───────────────────────────────────

export function SimplifyFormView({
  value,
  onChange,
}: {
  value: SimplifyForm;
  onChange: (v: SimplifyForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="First term"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4"
            value={value.firstTerm}
            onChange={(e) => onChange({ ...value, firstTerm: e.target.value })}
          />
        </div>
        <TermSeparator>:</TermSeparator>
        <div className="min-w-0 flex-1">
          <Input
            label="Second term"
            inputMode="numeric"
            autoComplete="off"
            placeholder="6"
            value={value.secondTerm}
            onChange={(e) => onChange({ ...value, secondTerm: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Try an example</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example ratios">
          {RATIO_EXAMPLE_PRESETS.map((p) => (
            <ExampleChip
              key={`${p.firstTerm}:${p.secondTerm}`}
              label={`${p.firstTerm}:${p.secondTerm}`}
              active={
                value.firstTerm === String(p.firstTerm) &&
                value.secondTerm === String(p.secondTerm)
              }
              onSelect={() =>
                onChange({
                  firstTerm: String(p.firstTerm),
                  secondTerm: String(p.secondTerm),
                })
              }
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Both terms must be whole numbers. The calculator divides them by
        their greatest common divisor to reach lowest terms.
      </p>
    </div>
  );
}

// ── Mode B: Solve proportion ─────────────────────────────────

export function ProportionFormView({
  value,
  onChange,
}: {
  value: ProportionForm;
  onChange: (v: ProportionForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="First term"
            inputMode="numeric"
            autoComplete="off"
            placeholder="2"
            value={value.firstTerm}
            onChange={(e) => onChange({ ...value, firstTerm: e.target.value })}
          />
        </div>
        <TermSeparator>:</TermSeparator>
        <div className="min-w-0 flex-1">
          <Input
            label="Second term"
            inputMode="numeric"
            autoComplete="off"
            placeholder="3"
            value={value.secondTerm}
            onChange={(e) => onChange({ ...value, secondTerm: e.target.value })}
          />
        </div>
        <TermSeparator>=</TermSeparator>
        <div className="min-w-0 flex-1">
          <Input
            label="Third term"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4"
            value={value.thirdTerm}
            onChange={(e) => onChange({ ...value, thirdTerm: e.target.value })}
          />
        </div>
        <TermSeparator>:</TermSeparator>
        <span
          className="flex h-10 shrink-0 items-center rounded-md border border-dashed border-primary/40 px-3 text-sm font-semibold text-primary"
          title="Solved in the result panel"
        >
          x
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Try an example</p>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Example proportions"
        >
          {PROPORTION_EXAMPLE_PRESETS.map((p) => (
            <ExampleChip
              key={`${p.firstTerm}:${p.secondTerm}:${p.thirdTerm}`}
              label={`${p.firstTerm}:${p.secondTerm}=${p.thirdTerm}`}
              active={
                value.firstTerm === String(p.firstTerm) &&
                value.secondTerm === String(p.secondTerm) &&
                value.thirdTerm === String(p.thirdTerm)
              }
              onSelect={() =>
                onChange({
                  firstTerm: String(p.firstTerm),
                  secondTerm: String(p.secondTerm),
                  thirdTerm: String(p.thirdTerm),
                })
              }
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Solves a : b = c : x for the missing term — x = (b × c) ÷ a. All
        terms must be whole numbers and the first term cannot be zero.
      </p>
    </div>
  );
}

// ── Mode C: Divide amount in ratio ───────────────────────────

export function DivideFormView({
  value,
  onChange,
}: {
  value: DivideForm;
  onChange: (v: DivideForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          label="Amount to divide"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1000"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common amounts">
          {RATIO_AMOUNT_PRESETS.map((amount) => (
            <ExampleChip
              key={amount}
              label={amount >= 1000 ? `₹${amount / 1000}k` : `₹${amount}`}
              active={value.amount === String(amount)}
              onSelect={() => onChange({ ...value, amount: String(amount) })}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="First part"
              inputMode="numeric"
              autoComplete="off"
              placeholder="2"
              value={value.firstTerm}
              onChange={(e) => onChange({ ...value, firstTerm: e.target.value })}
            />
          </div>
          <TermSeparator>:</TermSeparator>
          <div className="min-w-0 flex-1">
            <Input
              label="Second part"
              inputMode="numeric"
              autoComplete="off"
              placeholder="3"
              value={value.secondTerm}
              onChange={(e) => onChange({ ...value, secondTerm: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common split ratios">
          {RATIO_SPLIT_PRESETS.map((p) => (
            <ExampleChip
              key={`${p.firstTerm}:${p.secondTerm}`}
              label={`${p.firstTerm}:${p.secondTerm}`}
              active={
                value.firstTerm === String(p.firstTerm) &&
                value.secondTerm === String(p.secondTerm)
              }
              onSelect={() =>
                onChange({
                  ...value,
                  firstTerm: String(p.firstTerm),
                  secondTerm: String(p.secondTerm),
                })
              }
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The amount is shared across total parts (first + second). Shares
        always add back up to the amount exactly, even after rounding.
      </p>
    </div>
  );
}
