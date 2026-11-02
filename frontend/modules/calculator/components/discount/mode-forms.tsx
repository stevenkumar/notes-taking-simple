"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type {
  BogoForm,
  CompareForm,
  BasketForm,
  DiscountType,
  FixedForm,
  MultipleForm,
  QuantityForm,
  SimpleForm,
  TaxForm,
} from "./types";

// ── Shared controls ──────────────────────────────────────────

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

/** Radio-style toggle used for discount types and BOGO kinds. */
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

const QUICK_PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 70];

/** Quick percentage selector chips (PRD §6.11 UX). */
function QuickPercent({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (percent: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick discount percentages">
      {QUICK_PERCENTS.map((p) => {
        const active = value === String(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(String(p))}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p}%
          </button>
        );
      })}
    </div>
  );
}

const DISCOUNT_TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "percent", label: "Percent %" },
  { value: "fixed", label: "Amount ₹" },
];

function discountPrefix(type: DiscountType): string | undefined {
  return type === "fixed" ? "₹" : undefined;
}

function discountSuffix(type: DiscountType): string | undefined {
  return type === "percent" ? "%" : undefined;
}

// ── Mode A: simple percentage ────────────────────────────────

export function SimpleFormView({
  value,
  onChange,
}: {
  value: SimpleForm;
  onChange: (v: SimpleForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Original price (MRP)"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="2000"
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
        />
        <Input
          label="Discount"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="20"
          value={value.percent}
          onChange={(e) => onChange({ ...value, percent: e.target.value })}
        />
      </div>
      <QuickPercent value={value.percent} onSelect={(percent) => onChange({ ...value, percent })} />
    </div>
  );
}

// ── Mode B: fixed amount ─────────────────────────────────────

export function FixedFormView({
  value,
  onChange,
}: {
  value: FixedForm;
  onChange: (v: FixedForm) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Original price (MRP)"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1000"
        value={value.price}
        onChange={(e) => onChange({ ...value, price: e.target.value })}
      />
      <Input
        label="Discount amount"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="150"
        value={value.amount}
        onChange={(e) => onChange({ ...value, amount: e.target.value })}
      />
    </div>
  );
}

// ── Mode C: multiple sequential discounts ────────────────────

export function MultipleFormView({
  value,
  onChange,
}: {
  value: MultipleForm;
  onChange: (v: MultipleForm) => void;
}) {
  const setPercent = (i: number, v: string) => {
    const percents = [...value.percents];
    percents[i] = v;
    onChange({ ...value, percents });
  };

  const addPercent = () => onChange({ ...value, percents: [...value.percents, ""] });

  const removePercent = (i: number) =>
    onChange({ ...value, percents: value.percents.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <Input
        label="Original price (MRP)"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1000"
        value={value.price}
        onChange={(e) => onChange({ ...value, price: e.target.value })}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium">
          Discounts <span className="text-muted-foreground font-normal">(applied one after another)</span>
        </p>
        {value.percents.map((percent, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input
              label={`Discount ${i + 1}`}
              suffix="%"
              inputMode="decimal"
              autoComplete="off"
              placeholder={i === 0 ? "20" : "10"}
              className="flex-1"
              value={percent}
              onChange={(e) => setPercent(i, e.target.value)}
            />
            {value.percents.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 shrink-0"
                onClick={() => removePercent(i)}
                aria-label={`Remove discount ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPercent}>
          <Plus className="h-4 w-4" />
          Add discount
        </Button>
      </div>
    </div>
  );
}

// ── Mode D: BOGO / bundle ────────────────────────────────────

export function BogoFormView({
  value,
  onChange,
}: {
  value: BogoForm;
  onChange: (v: BogoForm) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Item price"
        prefix="₹"
        inputMode="decimal"
        autoComplete="off"
        placeholder="100"
        value={value.price}
        onChange={(e) => onChange({ ...value, price: e.target.value })}
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Offer type</p>
        <Segmented
          label="Offer type"
          value={value.kind}
          options={[
            { value: "bogo", label: "Buy X Get Y" },
            { value: "bundle", label: "Bundle price" },
          ]}
          onChange={(kind) => onChange({ ...value, kind })}
        />
      </div>

      {value.kind === "bogo" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Buy (pay for)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="2"
            value={value.buy}
            onChange={(e) => onChange({ ...value, buy: e.target.value })}
          />
          <Input
            label="Get free"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1"
            value={value.free}
            onChange={(e) => onChange({ ...value, free: e.target.value })}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Items in bundle"
            inputMode="numeric"
            autoComplete="off"
            placeholder="3"
            value={value.bundleQty}
            onChange={(e) => onChange({ ...value, bundleQty: e.target.value })}
          />
          <Input
            label="Bundle price"
            prefix="₹"
            inputMode="decimal"
            autoComplete="off"
            placeholder="250"
            value={value.bundlePrice}
            onChange={(e) => onChange({ ...value, bundlePrice: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// ── Mode E: quantity deal ────────────────────────────────────

export function QuantityFormView({
  value,
  onChange,
}: {
  value: QuantityForm;
  onChange: (v: QuantityForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Unit price"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="500"
          value={value.unitPrice}
          onChange={(e) => onChange({ ...value, unitPrice: e.target.value })}
        />
        <Input
          label="Quantity"
          inputMode="decimal"
          autoComplete="off"
          placeholder="3"
          value={value.qty}
          onChange={(e) => onChange({ ...value, qty: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Discount</p>
        <div className="flex items-end gap-3">
          <Segmented
            label="Discount type"
            value={value.discountType}
            options={DISCOUNT_TYPE_OPTIONS}
            onChange={(discountType) => onChange({ ...value, discountType })}
          />
          <Input
            aria-label="Discount value"
            prefix={discountPrefix(value.discountType)}
            suffix={discountSuffix(value.discountType)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="10"
            className="w-32"
            value={value.discountValue}
            onChange={(e) => onChange({ ...value, discountValue: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Mode F: tax + discount ───────────────────────────────────

export function TaxFormView({
  value,
  onChange,
}: {
  value: TaxForm;
  onChange: (v: TaxForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Original price"
          prefix="₹"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1000"
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
        />
        <Input
          label="Discount"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="10"
          value={value.discountPercent}
          onChange={(e) => onChange({ ...value, discountPercent: e.target.value })}
        />
        <Input
          label="Tax rate (optional)"
          suffix="%"
          inputMode="decimal"
          autoComplete="off"
          placeholder="18"
          value={value.taxRate}
          onChange={(e) => onChange({ ...value, taxRate: e.target.value })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Order: discount is applied first, then tax on the discounted price.
      </p>
    </div>
  );
}

// ── Mode G: compare offers ───────────────────────────────────

export function CompareFormView({
  value,
  onChange,
}: {
  value: CompareForm;
  onChange: (v: CompareForm) => void;
}) {
  const setOffer = (i: number, patch: Partial<(typeof value.offers)[number]>) => {
    const offers = value.offers.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onChange({ ...value, offers });
  };

  const addOffer = () =>
    onChange({
      ...value,
      offers: [
        ...value.offers,
        {
          id: `offer-${Date.now().toString(36)}`,
          name: `Offer ${value.offers.length + 1}`,
          price: "",
          discountType: "percent",
          discountValue: "",
        },
      ],
    });

  const removeOffer = (i: number) =>
    onChange({ ...value, offers: value.offers.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {value.offers.map((offer, i) => (
        <div key={offer.id} className="rounded-lg border border-border p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Offer {i + 1}</span>
            {value.offers.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => removeOffer(i)}
                aria-label={`Remove offer ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Offer name"
              autoComplete="off"
              placeholder={`Offer ${i + 1}`}
              value={offer.name}
              onChange={(e) => setOffer(i, { name: e.target.value })}
            />
            <Input
              label="Original price"
              prefix="₹"
              inputMode="decimal"
              autoComplete="off"
              placeholder="2000"
              value={offer.price}
              onChange={(e) => setOffer(i, { price: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-3">
            <Segmented
              label={`Offer ${i + 1} discount type`}
              value={offer.discountType}
              options={DISCOUNT_TYPE_OPTIONS}
              onChange={(discountType) => setOffer(i, { discountType })}
            />
            <Input
              aria-label={`Offer ${i + 1} discount value`}
              prefix={discountPrefix(offer.discountType)}
              suffix={discountSuffix(offer.discountType)}
              inputMode="decimal"
              autoComplete="off"
              placeholder={offer.discountType === "percent" ? "20" : "350"}
              className="w-32"
              value={offer.discountValue}
              onChange={(e) => setOffer(i, { discountValue: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOffer}>
        <Plus className="h-4 w-4" />
        Add offer
      </Button>
    </div>
  );
}

// ── Mode H: counter bill ─────────────────────────────────────

export function BasketFormView({
  value,
  onChange,
}: {
  value: BasketForm;
  onChange: (v: BasketForm) => void;
}) {
  const setItem = (i: number, patch: Partial<(typeof value.items)[number]>) => {
    const items = value.items.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
    onChange({ ...value, items });
  };

  const addItem = () =>
    onChange({
      ...value,
      items: [
        ...value.items,
        {
          id: `item-${Date.now().toString(36)}`,
          name: "",
          mrp: "",
          qty: "1",
          discountType: "percent",
          discountValue: "",
          taxRate: "",
        },
      ],
    });

  const removeItem = (i: number) =>
    onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {value.items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-border p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Product {i + 1}
            </span>
            {value.items.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => removeItem(i)}
                aria-label={`Remove product ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                label="Product name"
                autoComplete="off"
                placeholder="e.g. Shirt"
                value={item.name}
                onChange={(e) => setItem(i, { name: e.target.value })}
              />
            </div>
            <Input
              label="Quantity"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1"
              value={item.qty}
              onChange={(e) => setItem(i, { qty: e.target.value })}
            />
            <Input
              label="MRP (per item)"
              prefix="₹"
              inputMode="decimal"
              autoComplete="off"
              placeholder="499"
              value={item.mrp}
              onChange={(e) => setItem(i, { mrp: e.target.value })}
            />
            <div className="sm:col-span-2 flex items-end gap-3">
              <Segmented
                label={`Product ${i + 1} discount type`}
                value={item.discountType}
                options={DISCOUNT_TYPE_OPTIONS}
                onChange={(discountType) => setItem(i, { discountType })}
              />
              <Input
                aria-label={`Product ${i + 1} discount value`}
                prefix={discountPrefix(item.discountType)}
                suffix={discountSuffix(item.discountType)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="10"
                className="w-28"
                value={item.discountValue}
                onChange={(e) => setItem(i, { discountValue: e.target.value })}
              />
            </div>
            <Input
              label="Tax rate (optional)"
              suffix="%"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={item.taxRate}
              onChange={(e) => setItem(i, { taxRate: e.target.value })}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4" />
          Add product
        </Button>
        <p className="text-xs text-muted-foreground">Discount on line total, then tax.</p>
      </div>
    </div>
  );
}
