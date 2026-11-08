"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import type { DateTimeForm, DayDirection } from "./types";

// ── Shared direction pills (mode B) ──────────────────────────

function DirectionPills({
  value,
  onChange,
}: {
  value: DayDirection;
  onChange: (v: DayDirection) => void;
}) {
  const options: Array<{ value: DayDirection; label: string }> = [
    { value: "add", label: "+ Add days" },
    { value: "subtract", label: "− Subtract days" },
  ];
  return (
    <div role="radiogroup" aria-label="Direction" className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
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

// ── Mode A: date difference ──────────────────────────────────

export function DifferenceFormView({
  value,
  onChange,
}: {
  value: DateTimeForm;
  onChange: (v: DateTimeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="From date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <Input
        label="To date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Order does not matter — if the dates arrive backwards the result is
        measured from the earlier one anyway.
      </p>
    </div>
  );
}

// ── Mode B: add / subtract days ──────────────────────────────

export function AddDaysFormView({
  value,
  onChange,
}: {
  value: DateTimeForm;
  onChange: (v: DateTimeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Start date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
      />
      <div className="space-y-2">
        <Input
          label="Number of days"
          inputMode="numeric"
          autoComplete="off"
          placeholder="100"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <DirectionPills
          value={value.direction}
          onChange={(direction) => onChange({ ...value, direction })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Whole days only — the result reports the exact date and the weekday
        it lands on.
      </p>
    </div>
  );
}

// ── Mode C: working days ─────────────────────────────────────

export function WorkingDaysFormView({
  value,
  onChange,
}: {
  value: DateTimeForm;
  onChange: (v: DateTimeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="From date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <Input
        label="To date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Monday–Friday count including both endpoints; weekends are listed
        separately. No public-holiday calendar is applied.
      </p>
    </div>
  );
}

// ── Mode D: countdown ─────────────────────────────────────────

export function CountdownFormView({
  value,
  onChange,
}: {
  value: DateTimeForm;
  onChange: (v: DateTimeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Target date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.target}
        onChange={(e) => onChange({ ...value, target: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Days are counted from today automatically — past dates show how long
        ago they were instead.
      </p>
    </div>
  );
}
