"use client";

import type { ReactNode } from "react";
import { AlertCircle, Calculator, Copy, Check, Share2, Save, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { ComputeState } from "./types";

interface ResultPanelProps {
  result: ComputeState;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onSave: () => void;
  onClear: () => void;
}

/**
 * Prominent payable-amount display (PRD §6.11 UX):
 * result updates immediately, payable is the hero value,
 * with breakdown, formula note and copy/share/save/clear actions.
 */
export function ResultPanel({
  result,
  copied,
  onCopy,
  onShare,
  onSave,
  onClear,
}: ResultPanelProps) {
  const isOk = result.state === "ok";
  const actionsDisabled = !isOk;

  return (
    <Card className="lg:sticky lg:top-6">
      <CardContent className="p-5 sm:p-6">
        {/* ── Incomplete ── */}
        {result.state === "incomplete" && (
          <div className="flex flex-col items-center justify-center py-12 text-center" aria-live="polite">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <Calculator className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">Enter values to see your result</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              The payable amount updates instantly as you type.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {result.state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
            aria-live="assertive"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-destructive">Cannot calculate</p>
              <p className="text-sm text-destructive/90 mt-0.5">{result.message}</p>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {isOk && (
          <div aria-live="polite">
            <p className="text-sm font-medium text-muted-foreground">
              {result.view.headlineLabel}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {result.view.headlineValue}
            </p>

            {result.view.subLabel && result.view.subValue && (
              <p className="mt-2 text-sm text-muted-foreground">
                {result.view.subLabel}:{" "}
                <span className="font-semibold text-success">{result.view.subValue}</span>
              </p>
            )}

            {/* Detail rows */}
            <dl className="mt-5 space-y-2.5 border-t border-border pt-4">
              {result.view.rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd
                    className={cn(
                      "tabular-nums text-right",
                      row.emphasis ? "font-semibold text-foreground" : "text-foreground",
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Breakdown (steps / per-item) */}
            {result.view.breakdown && result.view.breakdown.rows.length > 0 && (
              <div className="mt-4 rounded-lg bg-muted/60 p-3.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {result.view.breakdown.title}
                </p>
                <dl className="space-y-1.5">
                  {result.view.breakdown.rows.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
                      <dt className="text-muted-foreground truncate">{row.label}</dt>
                      <dd className={cn("tabular-nums text-right", row.emphasis ? "font-semibold" : "")}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Formula / order note */}
            {result.view.note && (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground border-t border-border pt-3">
                {result.view.note}
              </p>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            variant={copied ? "success" : "outline"}
            size="sm"
            onClick={onCopy}
            disabled={actionsDisabled}
            aria-label={copied ? "Copied" : "Copy result"}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            disabled={actionsDisabled}
            aria-label="Share result"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={actionsDisabled}
            aria-label="Save calculation to history"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            aria-label="Clear all inputs"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
