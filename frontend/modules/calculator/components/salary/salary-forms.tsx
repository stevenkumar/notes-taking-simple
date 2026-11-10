"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  SALARY_BASIC_PERCENT_PRESETS,
  SALARY_CTC_PRESETS,
  SALARY_GROSS_PRESETS,
} from "../../engine/salary-calculator";
import type { SalaryCtcForm, SalaryGrossForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

/** Chip row: press to fill the paired input (mirrors the interest chips). */
function ChipRow({
  label,
  options,
  value,
  onSelect,
  format,
}: {
  label: string;
  options: readonly number[];
  value: string;
  onSelect: (value: string) => void;
  format: (option: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const active = value === String(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(String(option))}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {format(option)}
          </button>
        );
      })}
    </div>
  );
}

/** ₹6L / ₹25k style labels for salary preset chips. */
function formatSalaryPreset(value: number): string {
  return value >= 100000 ? `₹${value / 100000}L` : `₹${value / 1000}k`;
}

const percentFormat = (value: number) => `${value}%`;

/** Shared PF / tax / other deduction inputs (identical in both modes). */
function DeductionFields({
  pfPercent,
  professionalTax,
  otherDeductions,
  onChange,
}: {
  pfPercent: string;
  professionalTax: string;
  otherDeductions: string;
  onChange: (patch: {
    pfPercent?: string;
    professionalTax?: string;
    otherDeductions?: string;
  }) => void;
}) {
  return (
    <>
      <Input
        label="PF % of basic"
        suffix="%"
        inputMode="decimal"
        autoComplete="off"
        placeholder="12"
        value={pfPercent}
        onChange={(e) => onChange({ pfPercent: e.target.value })}
      />
      <Input
        label="Professional tax"
        prefix="₹"
        suffix="/ month"
        inputMode="decimal"
        autoComplete="off"
        placeholder="200"
        value={professionalTax}
        onChange={(e) => onChange({ professionalTax: e.target.value })}
      />
      <Input
        label="Other deductions"
        prefix="₹"
        suffix="/ month"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={otherDeductions}
        onChange={(e) => onChange({ otherDeductions: e.target.value })}
      />
    </>
  );
}

// ── Mode A: CTC → Take-home ──────────────────────────────────

export function SalaryCtcFormView({
  value,
  onChange,
}: {
  value: SalaryCtcForm;
  onChange: (v: SalaryCtcForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          label="Annual CTC"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1200000"
          value={value.annualCtc}
          onChange={(e) => onChange({ ...value, annualCtc: e.target.value })}
        />
        <ChipRow
          label="Common annual CTC"
          options={SALARY_CTC_PRESETS}
          value={value.annualCtc}
          onSelect={(annualCtc) => onChange({ ...value, annualCtc })}
          format={formatSalaryPreset}
        />
      </div>
      <div className="space-y-2">
        <Input
          label="Basic % of CTC"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="40"
          value={value.basicPercent}
          onChange={(e) => onChange({ ...value, basicPercent: e.target.value })}
        />
        <ChipRow
          label="Common basic salary shares"
          options={SALARY_BASIC_PERCENT_PRESETS}
          value={value.basicPercent}
          onSelect={(basicPercent) => onChange({ ...value, basicPercent })}
          format={percentFormat}
        />
      </div>
      <DeductionFields
        pfPercent={value.pfPercent}
        professionalTax={value.professionalTax}
        otherDeductions={value.otherDeductions}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />
      <p className="text-xs text-muted-foreground">
        Employer PF is part of the CTC and reduces gross; employee PF,
        professional tax and other deductions reduce take-home. The same PF
        rate applies to both sides.
      </p>
    </div>
  );
}

// ── Mode B: Monthly gross → Take-home ────────────────────────

export function SalaryGrossFormView({
  value,
  onChange,
}: {
  value: SalaryGrossForm;
  onChange: (v: SalaryGrossForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          label="Monthly gross salary"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="50000"
          value={value.monthlyGross}
          onChange={(e) => onChange({ ...value, monthlyGross: e.target.value })}
        />
        <ChipRow
          label="Common monthly gross salaries"
          options={SALARY_GROSS_PRESETS}
          value={value.monthlyGross}
          onSelect={(monthlyGross) => onChange({ ...value, monthlyGross })}
          format={formatSalaryPreset}
        />
      </div>
      <div className="space-y-2">
        <Input
          label="Basic % of gross"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="40"
          value={value.basicPercent}
          onChange={(e) => onChange({ ...value, basicPercent: e.target.value })}
        />
        <ChipRow
          label="Common basic salary shares"
          options={SALARY_BASIC_PERCENT_PRESETS}
          value={value.basicPercent}
          onSelect={(basicPercent) => onChange({ ...value, basicPercent })}
          format={percentFormat}
        />
      </div>
      <DeductionFields
        pfPercent={value.pfPercent}
        professionalTax={value.professionalTax}
        otherDeductions={value.otherDeductions}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />
      <p className="text-xs text-muted-foreground">
        Employee PF applies to the basic component; professional tax and other
        deductions are flat monthly amounts.
      </p>
    </div>
  );
}
