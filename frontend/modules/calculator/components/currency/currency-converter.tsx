"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Coins, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addHistoryEntry,
  loadHistory,
  removeHistoryEntry,
  timeAgo,
} from "@/utils/history";
import type { HistoryEntry } from "../../types";
import {
  DEFAULT_RATES,
  getCurrency,
} from "../../engine/currency-calculator";
import { ResultPanel } from "../shared/result-panel";
import { computeCurrencyResult } from "./compute";
import { CurrencyFormView, RateTable } from "./currency-forms";
import {
  CURRENCY_INITIAL_FORM,
  DEFAULT_RATES_STATE,
  RATES_STORAGE_KEY,
  type CurrencyForm,
  type RatesState,
} from "./types";

/**
 * Currency Converter — offline conversion across 12 currencies with an
 * editable rate table. All math runs locally in the decimal engine; the
 * rate table persists to localStorage with a freshness badge.
 */
export function CurrencyConverter() {
  const [form, setForm] = useState<CurrencyForm>(CURRENCY_INITIAL_FORM);
  const [ratesState, setRatesState] = useState<RatesState>(DEFAULT_RATES_STATE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(loadHistory("currency"));
    try {
      const raw = localStorage.getItem(RATES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RatesState>;
        if (parsed && typeof parsed.rates === "object" && parsed.rates) {
          setRatesState({
            rates: { ...DEFAULT_RATES, ...parsed.rates },
            source: parsed.source === "custom" ? "custom" : "default",
            editedAt: typeof parsed.editedAt === "number" ? parsed.editedAt : null,
          });
        }
      }
    } catch {
      // Corrupt or unavailable storage — keep the built-in defaults.
    }
  }, []);

  const result = useMemo(
    () => computeCurrencyResult(form, ratesState),
    [form, ratesState],
  );
  const resultValue = result.state === "ok" ? result.view.headlineValue : null;

  const handleClear = () => setForm(CURRENCY_INITIAL_FORM);

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleCopy = async () => {
    if (result.state !== "ok") return;
    try {
      await navigator.clipboard.writeText(result.view.copyText);
      markCopied();
    } catch {
      // Clipboard unavailable (insecure context) — silently ignore
    }
  };

  const handleShare = async () => {
    if (result.state !== "ok") return;
    const text = result.view.copyText;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Everyday — Currency Converter", text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Sharing failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      markCopied();
    } catch {
      // nothing available
    }
  };

  const handleSave = () => {
    if (result.state !== "ok") return;
    const entry = addHistoryEntry({
      calculatorId: "currency",
      calculatorName: "Currency Calculator",
      title: result.view.headlineLabel,
      inputs: { form },
      result: {
        headlineLabel: result.view.headlineLabel,
        headlineValue: result.view.headlineValue,
        subLabel: result.view.subLabel ?? null,
        subValue: result.view.subValue ?? null,
      },
      summary: `${result.view.headlineLabel} = ${result.view.headlineValue}`,
    });
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  };

  const handleLoad = (entry: HistoryEntry) => {
    const payload = entry.inputs as { form?: Partial<CurrencyForm> };
    if (!payload.form) return;
    setForm((prev) => ({ ...prev, ...payload.form }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    removeHistoryEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleRateChange = (currencyId: string, raw: string) => {
    setRatesState((prev) => {
      const next: RatesState = {
        rates: { ...prev.rates, [currencyId]: raw },
        source: "custom",
        editedAt: Date.now(),
      };
      try {
        localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — the edit still applies in memory.
      }
      return next;
    });
  };

  const handleResetRates = () => {
    setRatesState(DEFAULT_RATES_STATE);
    try {
      localStorage.removeItem(RATES_STORAGE_KEY);
    } catch {
      // nothing to clean up
    }
  };

  const from = getCurrency(form.from);
  const to = getCurrency(form.to);

  return (
    <div className="space-y-6">
      {/* ── Form + live result ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold"
              >
                <Coins className="h-4 w-4" />
              </span>
              Convert money
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {from && to
                ? `Amount in ${from.name}, result in ${to.name} — swap any time with the button below.`
                : "Type an amount and pick two currencies."}
            </p>
          </CardHeader>
          <CardContent>
            <CurrencyFormView
              value={form}
              resultValue={resultValue}
              onChange={setForm}
            />
          </CardContent>
        </Card>

        <ResultPanel
          result={result}
          copied={copied}
          onCopy={handleCopy}
          onShare={handleShare}
          onSave={handleSave}
          onClear={handleClear}
        />
      </div>

      {/* ── Editable rate table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Exchange rates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every rate is quoted against 1 USD. Edit values to match your
            provider — changes save automatically on this device.
          </p>
        </CardHeader>
        <CardContent>
          <RateTable
            ratesState={ratesState}
            onRateChange={handleRateChange}
            onReset={handleResetRates}
          />
        </CardContent>
      </Card>

      {/* ── Saved calculations ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Recent calculations
            </CardTitle>
            <Badge variant="secondary">{history.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No saved calculations yet — press{" "}
              <span className="font-medium text-foreground">Save</span> on a result
              to keep it here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-2 py-3 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.summary} · {timeAgo(h.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoad(h)}
                    aria-label={`Load calculation ${h.title}`}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(h.id)}
                    aria-label={`Delete calculation ${h.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
