"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { PERCENT_PRESETS } from "../../engine/percentage-calculator";
import type { FieldMeta, ModeMeta, PercentForm } from "./types";

// ── Shared controls ──────────────────────────────────────────

/** Quick percent chips (5/10/15/20/25/50) — one tap sets the field. */
function PercentChips({
  value,
  onSelect,
  label,
}: {
  value: string;
  onSelect: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {PERCENT_PRESETS.map((preset) => {
        const active = value === String(preset);
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onSelect(String(preset))}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {preset}%
          </button>
        );
      })}
    </div>
  );
}

/**
 * One generic two-field form for any percentage mode.
 * Field labels, placeholders, percent suffixes and chip placement all come
 * from MODE_META, so the ten modes share a single implementation.
 */
export function ModeFormView({
  meta,
  value,
  onChange,
}: {
  meta: ModeMeta;
  value: PercentForm;
  onChange: (value: PercentForm) => void;
}) {
  const renderField = (which: "first" | "second") => {
    const field: FieldMeta = meta[which];
    return (
      <div className="space-y-2" key={which}>
        <Input
          label={field.label}
          suffix={field.suffix}
          inputMode="decimal"
          autoComplete="off"
          placeholder={field.placeholder}
          value={value[which]}
          onChange={(e) => onChange({ ...value, [which]: e.target.value })}
        />
        {meta.chipFields.includes(which) && (
          <PercentChips
            value={value[which]}
            label={`${field.label} quick values`}
            onSelect={(preset) => onChange({ ...value, [which]: preset })}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderField("first")}
      {renderField("second")}
      {meta.hint && (
        <p className="text-xs text-muted-foreground">{meta.hint}</p>
      )}
    </div>
  );
}
