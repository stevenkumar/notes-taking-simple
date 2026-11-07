"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatGroupedNumericString } from "@/utils/format";
import {
  addHistoryEntry,
  loadHistory,
  removeHistoryEntry,
  timeAgo,
} from "@/utils/history";
import type { HistoryEntry } from "../../types";
import {
  createBasicState,
  pressKey,
  KEY_LABELS,
  KEYBOARD_MAP,
  KEYPAD_LAYOUT,
  OPERATOR_SYMBOLS,
  type BasicKey,
  type BasicState,
} from "../../engine/basic-calculator";
import { ResultPanel } from "../shared/result-panel";
import type { ComputeState } from "../shared/result-types";

/**
 * Basic Calculator — 4×5 keypad over the pure pressKey reducer.
 * Display and equation line update on every key press (mouse or keyboard),
 * the shared ResultPanel mirrors the state live, and completed calculations
 * can be saved to local history. Works fully offline.
 */

/** What the user sees on each key face (the engine stores semantic ids). */
const VISIBLE_LABELS: Record<BasicKey, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".",
  ...OPERATOR_SYMBOLS,
  equals: "=",
  percent: "%",
  sign: "±",
  clear: "AC",
  backspace: "⌫",
};

function variantFor(key: BasicKey): "default" | "secondary" | "outline" {
  if (key === "equals") return "default";
  if (key in OPERATOR_SYMBOLS) return "secondary";
  return "outline";
}

function classesFor(key: BasicKey): string {
  const base = "h-12 text-base font-medium";
  if (key === "equals" || key in OPERATOR_SYMBOLS) {
    return cn(base, "text-lg font-semibold");
  }
  if (key === "clear" || key === "backspace") {
    return cn(base, "text-destructive hover:text-destructive");
  }
  return base;
}

export function BasicCalculator() {
  const [state, setState] = useState<BasicState>(createBasicState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(loadHistory("basic"));
  }, []);

  const press = useCallback((key: BasicKey) => {
    setState((prev) => pressKey(prev, key));
  }, []);

  /** Physical keyboard → reducer (Enter/Space left to focused buttons). */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // A focused button handles Enter/Space as its own click.
      if (target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) {
        return;
      }
      const key = KEYBOARD_MAP[e.key];
      if (!key) return;
      e.preventDefault();
      setState((prev) => pressKey(prev, key));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const result = useMemo<ComputeState>(() => {
    if (state.error) return { state: "error", message: state.error };
    if (!state.expression) return { state: "incomplete" };

    const value = formatGroupedNumericString(state.display);
    const done = state.expression.endsWith("=");
    return {
      state: "ok",
      view: {
        headlineLabel: done ? "Result" : "Current value",
        headlineValue: value,
        rows: [{ label: "Calculation", value: state.expression }],
        note: done
          ? state.lastOp
            ? "Press = again to repeat the last operation, or type a new number."
            : "Type a new number to start another calculation."
          : "Waiting for the second number — type it and press =.",
        copyText: `${state.expression} ${value}`,
      },
    };
  }, [state]);

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
        await navigator.share({ title: "Everyday — Basic Calculator", text });
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
      calculatorId: "basic",
      calculatorName: "Basic Calculator",
      title: result.view.copyText,
      inputs: { display: state.display, expression: state.expression },
      result: {
        headlineLabel: result.view.headlineLabel,
        headlineValue: result.view.headlineValue,
      },
      summary: `${result.view.headlineLabel}: ${result.view.headlineValue}`,
    });
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  };

  const handleClear = () => setState(createBasicState());

  const handleLoad = (entry: HistoryEntry) => {
    const payload = entry.inputs as {
      display?: string;
      expression?: string | null;
    };
    if (typeof payload.display !== "string") return;
    setState({
      ...createBasicState(),
      display: payload.display,
      expression: typeof payload.expression === "string" ? payload.expression : null,
      awaitingOperand: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    removeHistoryEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Display + keypad ── */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="rounded-lg bg-muted/60 px-4 py-4">
              <p className="min-h-5 overflow-x-auto whitespace-nowrap text-right text-sm text-muted-foreground tabular-nums">
                {state.expression ?? "\u00A0"}
              </p>
              <p
                className={cn(
                  "overflow-x-auto whitespace-nowrap text-right tabular-nums",
                  state.error
                    ? "mt-1 text-base font-medium text-destructive"
                    : "mt-1 text-3xl font-semibold sm:text-4xl",
                )}
              >
                {state.error ?? formatGroupedNumericString(state.display)}
              </p>
            </div>

            <div
              role="group"
              aria-label="Calculator keypad"
              className="mt-4 grid gap-2"
            >
              {KEYPAD_LAYOUT.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-2">
                  {row.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant={variantFor(key)}
                      className={classesFor(key)}
                      onClick={() => press(key)}
                      aria-label={KEY_LABELS[key]}
                    >
                      {VISIBLE_LABELS[key]}
                    </Button>
                  ))}
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Keyboard works too — digits, + − × ÷, %, Enter/=, Backspace, Esc
            </p>
          </CardContent>
        </Card>

        {/* ── Live result ── */}
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
