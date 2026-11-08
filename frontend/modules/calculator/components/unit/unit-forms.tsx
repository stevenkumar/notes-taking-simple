"use client";

import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { UNIT_CATEGORIES, getCategory, type UnitDef } from "../../engine/unit-converter";
import { CATEGORY_DEFAULT_UNITS, type UnitForm } from "./types";

// ── Category pills ───────────────────────────────────────────

function CategoryPills({
  value,
  onChange,
}: {
  value: UnitForm["category"];
  onChange: (category: UnitForm["category"]) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Conversion category"
      className="flex flex-wrap gap-1.5"
    >
      {UNIT_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(cat.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

// ── Unit select ──────────────────────────────────────────────

function SelectField({
  id,
  label,
  value,
  units,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  units: UnitDef[];
  onChange: (unitId: string) => void;
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
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.symbol})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Full form ────────────────────────────────────────────────

export function UnitFormView({
  value,
  resultValue,
  onChange,
}: {
  value: UnitForm;
  /** Rounded result string, or null while incomplete / on error. */
  resultValue: string | null;
  onChange: (v: UnitForm) => void;
}) {
  const category = getCategory(value.category)!;
  const fromUnit = category.units.find((u) => u.id === value.fromUnit);
  const toUnit = category.units.find((u) => u.id === value.toUnit);

  const setCategory = (id: UnitForm["category"]) => {
    const defaults = CATEGORY_DEFAULT_UNITS[id];
    onChange({ ...value, category: id, fromUnit: defaults.from, toUnit: defaults.to });
  };

  return (
    <div className="space-y-4">
      <CategoryPills value={value.category} onChange={setCategory} />

      {/* From: value + unit */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Value"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
        />
        <SelectField
          id="unit-from"
          label="From"
          value={value.fromUnit}
          units={category.units}
          onChange={(fromUnit) => onChange({ ...value, fromUnit })}
        />
      </div>

      {/* Swap */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() =>
            onChange({ ...value, fromUnit: value.toUnit, toUnit: value.fromUnit })
          }
          aria-label={`Swap units (currently ${fromUnit?.symbol} and ${toUnit?.symbol})`}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
            "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Swap units
        </button>
      </div>

      {/* To: result + unit */}
      <div className="grid gap-3 sm:grid-cols-2">
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
        <SelectField
          id="unit-to"
          label="To"
          value={value.toUnit}
          units={category.units}
          onChange={(toUnit) => onChange({ ...value, toUnit })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {category.id === "temperature"
          ? "Temperature scales are offset (°C/°F/K) — negative values are allowed."
          : `All ${category.name.toLowerCase()} units convert through ${category.base} with exact decimal factors.`}
      </p>
    </div>
  );
}
