"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  createScientificState,
  KEY_LABELS,
  KEYBOARD_MAP,
  prettyExpression,
  pressScientificKey,
  SCIENTIFIC_KEYPAD,
  type AngleMode,
  type ScientificKey,
  type ScientificState,
} from "../../engine/scientific-calculator";
import { ResultPanel } from "../shared/result-panel";
import type { ComputeState } from "../shared/result-types";
import { deriveScientificState } from "./compute";

/**
 * Scientific Calculator — 7×5 keypad over the pure pressScientificKey
 * reducer, with a live expression preview, DEG/RAD toggle, physical
 * keyboard input and local save history. Works fully offline.
 */

/** What the user sees on each key face (the engine stores semantic ids). */
const VISIBLE_LABELS: Record<ScientificKey, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".",
  add: "+", subtract: "−", multiply: "×", divide: "÷", power: "^",
  equals: "=", clear: "AC", backspace: "⌫",
  lparen: "(", rparen: ")",
  percent: "%", factorial: "x!", square: "x²", reciprocal: "1/x",
  sin: "sin", cos: "cos", tan: "tan", log: "log", ln: "ln", sqrt: "√",
  pi: "π", e: "e", ans: "Ans",
  toggleAngle: "DEG", // face follows the live angle mode below
};

const OPERATOR_KEYS = new Set<ScientificKey>([
  "add", "subtract", "multiply", "divide", "power",
]);

const TEXT_KEYS = new Set<ScientificKey>([
  "sin", "cos", "tan", "log", "ln", "sqrt",
  "factorial", "square", "reciprocal", "ans", "pi", "e",
  "lparen", "rparen", "percent",
]);

function variantFor(key: ScientificKey): "default" | "secondary" | "outline" {
  if (key === "equals") return "default";
  if (OPERATOR_KEYS.has(key) || key === "toggleAngle") return "secondary";
  return "outline";
}

function classesFor(key: ScientificKey): string {
  const base = "h-11 text-base font-medium sm:h-12";
  if (key === "equals" || OPERATOR_KEYS.has(key)) {
    return cn(base, "text-lg font-semibold");
  }
  if (key === "clear" || key === "backspace") {
    return cn(base, "text-destructive hover:text-destructive");
  }
  if (key === "toggleAngle") {
    return cn(base, "text-xs font-bold tracking-wide sm:text-sm");
  }
  if (TEXT_KEYS.has(key)) return cn(base, "text-sm");
  return base;
}

export function ScientificCalculator() {
  const [state, setState] = useState<ScientificState>(createScientificState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(loadHistory("scientific"));
  }, []);

  const press = useCallback((key: ScientificKey) => {
    setState((prev) => pressScientificKey(prev, key));
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
      setState((prev) => pressScientificKey(prev, key));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const result = useMemo<ComputeState>(() => deriveScientificState(state), [state]);

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
        await navigator.share({ title: "Everyday — Scientific Calculator", text });
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
      calculatorId: "scientific",
      calculatorName: "Scientific Calculator",
      title:
        state.lastEquation ??
        `${prettyExpression(state.expression)} = ${result.view.headlineValue}`,
      inputs: {
        expression: state.expression,
        angleMode: state.angleMode,
        ans: state.ans,
        justCommitted: state.justCommitted,
      },
      result: {
        headlineLabel: result.view.headlineLabel,
        headlineValue: result.view.headlineValue,
      },
      summary: `${result.view.headlineLabel}: ${result.view.headlineValue}`,
    });
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  };

  const handleClear = () => setState(createScientificState());

  const handleLoad = (entry: HistoryEntry) => {
    const payload = entry.inputs as {
      expression?: string;
      angleMode?: AngleMode;
      ans?: string;
      justCommitted?: boolean;
    };
    if (typeof payload.expression !== "string") return;
    setState({
      ...createScientificState(),
      expression: payload.expression,
      angleMode: payload.angleMode === "rad" ? "rad" : "deg",
      ans: typeof payload.ans === "string" ? payload.ans : "0",
      justCommitted: payload.justCommitted === true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    removeHistoryEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const displayExpression = prettyExpression(state.expression);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Display + keypad ── */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="rounded-lg bg-muted/60 px-4 py-4">
              <p className="min-h-5 overflow-x-auto whitespace-nowrap text-right text-sm">
                {state.error ? (
                  <span className="font-medium text-destructive">{state.error}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {state.lastEquation ?? "\u00A0"}
                  </span>
                )}
              </p>
              <p className="mt-1 overflow-x-auto whitespace-nowrap text-right text-3xl font-semibold tabular-nums sm:text-4xl">
                {displayExpression || "\u00A0"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-bold tracking-wide",
                    state.angleMode === "deg"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-foreground",
                  )}
                >
                  {state.angleMode === "deg" ? "DEG" : "RAD"}
                </span>
                <span>Ans = {state.ans}</span>
              </div>
            </div>

            <div
              role="group"
              aria-label="Scientific keypad"
              className="mt-4 grid gap-2"
            >
              {SCIENTIFIC_KEYPAD.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-2">
                  {row.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant={variantFor(key)}
                      className={classesFor(key)}
                      onClick={() => press(key)}
                      aria-label={KEY_LABELS[key]}
                    >
                      {key === "toggleAngle"
                        ? state.angleMode === "deg"
                          ? "DEG"
                          : "RAD"
                        : VISIBLE_LABELS[key]}
                    </Button>
                  ))}
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Keyboard works too — digits, + − × ÷ ^ %, s c t l n r p e a for
              functions, Enter/=, Backspace, Esc
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
