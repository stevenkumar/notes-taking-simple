"use client";

import { Input } from "@/components/ui/input";
import type { AgeForm } from "./types";

// ── Mode A: current age ──────────────────────────────────────

export function CurrentFormView({
  value,
  onChange,
}: {
  value: AgeForm;
  onChange: (v: AgeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Date of birth"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.birthDate}
        onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Enter the date of birth — the exact age, total days lived and the
        next-birthday countdown update live. Dates are read as YYYY-MM-DD.
      </p>
    </div>
  );
}

// ── Mode B: age on a date ────────────────────────────────────

export function OnDateFormView({
  value,
  onChange,
}: {
  value: AgeForm;
  onChange: (v: AgeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Date of birth"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.birthDate}
        onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
      />
      <Input
        label="Age on this date"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Any date works — past or future. The reference date must fall on or
        after the date of birth.
      </p>
    </div>
  );
}

// ── Mode C: age difference ───────────────────────────────────

export function DifferenceFormView({
  value,
  onChange,
}: {
  value: AgeForm;
  onChange: (v: AgeForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="First person — date of birth"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.first}
        onChange={(e) => onChange({ ...value, first: e.target.value })}
      />
      <Input
        label="Second person — date of birth"
        type="date"
        autoComplete="off"
        max="9999-12-31"
        value={value.second}
        onChange={(e) => onChange({ ...value, second: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Order does not matter — the result always reports who is older and
        the exact gap in years, months and days.
      </p>
    </div>
  );
}
