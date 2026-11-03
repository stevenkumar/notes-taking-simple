"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Clock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  addHistoryEntry,
  loadHistory,
  removeHistoryEntry,
  timeAgo,
} from "@/utils/history";
import type { HistoryEntry } from "../../types";
import { ResultPanel } from "../shared/result-panel";
import { computeGstResult } from "./compute";
import { AddFormView, FindRateFormView, RemoveFormView } from "./gst-forms";
import {
  GST_INITIAL_FORMS,
  GST_MODE_META,
  type GstForms,
  type GstModeId,
} from "./types";

/**
 * GST Calculator (Modes A–C: add, remove, find rate).
 * All calculations run locally — works fully offline.
 */
export function GstCalculator() {
  const [mode, setMode] = useState<GstModeId>("add");
  const [forms, setForms] = useState<GstForms>(GST_INITIAL_FORMS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const tabRefs = useRef<Partial<Record<GstModeId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    setHistory(loadHistory("gst"));
  }, []);

  const result = useMemo(() => computeGstResult(mode, forms), [mode, forms]);

  const activeMeta = GST_MODE_META.find((m) => m.id === mode)!;

  const setForm = (patch: Partial<GstForms>) =>
    setForms((prev) => ({ ...prev, ...patch }));

  const handleClear = () =>
    setForms((prev) => ({ ...prev, [mode]: GST_INITIAL_FORMS[mode] }));

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
        await navigator.share({ title: "Everyday — GST Calculator", text });
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
      calculatorId: "gst",
      calculatorName: "GST Calculator",
      title: `${activeMeta.label} — ${result.view.headlineValue}`,
      inputs: { mode, values: forms[mode] },
      result: {
        headlineLabel: result.view.headlineLabel,
        headlineValue: result.view.headlineValue,
        subLabel: result.view.subLabel ?? null,
        subValue: result.view.subValue ?? null,
      },
      summary: `${result.view.headlineLabel}: ${result.view.headlineValue}`,
    });
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  };

  const handleLoad = (entry: HistoryEntry) => {
    const payload = entry.inputs as {
      mode?: GstModeId;
      values?: Record<string, unknown>;
    };
    if (!payload.mode || !payload.values) return;
    const nextMode = payload.mode;
    const merged = { ...GST_INITIAL_FORMS[nextMode], ...payload.values };
    setMode(nextMode);
    setForms((prev) => ({ ...prev, [nextMode]: merged } as GstForms));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    removeHistoryEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  /** Roving tabindex: left/right arrows move between mode tabs. */
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = GST_MODE_META.findIndex((m) => m.id === mode);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % GST_MODE_META.length;
    if (e.key === "ArrowLeft") nextIdx = (idx - 1 + GST_MODE_META.length) % GST_MODE_META.length;
    if (e.key === "Home") nextIdx = 0;
    if (e.key === "End") nextIdx = GST_MODE_META.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextMode = GST_MODE_META[nextIdx].id;
    setMode(nextMode);
    tabRefs.current[nextMode]?.focus();
  };

  const renderForm = () => {
    switch (mode) {
      case "add":
        return <AddFormView value={forms.add} onChange={(v) => setForm({ add: v })} />;
      case "remove":
        return <RemoveFormView value={forms.remove} onChange={(v) => setForm({ remove: v })} />;
      case "findRate":
        return <FindRateFormView value={forms.findRate} onChange={(v) => setForm({ findRate: v })} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Mode tabs (A–C) ── */}
      <div
        role="tablist"
        aria-label="GST calculator modes"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {GST_MODE_META.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabRefs.current[m.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setMode(m.id)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-primary-foreground/25" : "bg-muted text-muted-foreground",
                )}
              >
                {m.letter}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Form + live result ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold"
              >
                {activeMeta.letter}
              </span>
              {activeMeta.label}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderForm()}</CardContent>
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
