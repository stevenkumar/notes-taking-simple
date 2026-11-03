/**
 * Shared result view contracts rendered by ResultPanel.
 * Used by every calculator tool (discount, GST, ...) so the presentation
 * layer stays consistent across the app.
 */

export interface ResultRow {
  label: string;
  value: string;
  /** Slightly stronger weight (totals). */
  emphasis?: boolean;
}

export interface ResultBreakdown {
  title: string;
  rows: ResultRow[];
}

export interface ResultView {
  headlineLabel: string;
  headlineValue: string;
  subLabel?: string;
  subValue?: string;
  rows: ResultRow[];
  /** Optional per-step / per-item detail list. */
  breakdown?: ResultBreakdown;
  /** Formula or calculation-order explanation, e.g. "₹2,000 × 20% = ₹400". */
  note?: string;
  /** Plain-text summary for copy/share. */
  copyText: string;
}

export type ComputeState =
  | { state: "incomplete" }
  | { state: "error"; message: string }
  | { state: "ok"; view: ResultView };
