/**
 * Calculator module type contracts (PRD Phase 0 – calculation contracts).
 * These types define the shared vocabulary for every calculator tool.
 */

// ── Identifiers ──────────────────────────────────────────────

/** Unique slug for each calculator tool. */
export type CalculatorId =
  | "basic"
  | "scientific"
  | "gst"
  | "emi"
  | "interest"
  | "percentage"
  | "discount"
  | "age"
  | "date-time"
  | "unit"
  | "currency"
  // Planned (Phase 7+)
  | "salary"
  | "profit-loss"
  | "ratio"
  | "split-bill"
  | "bmi"
  | "fuel"
  | "electricity";

/** Tool categories from PRD §5.1. */
export type CalculatorCategory =
  | "basic-math"
  | "scientific-math"
  | "financial"
  | "shopping-discounts"
  | "date-time"
  | "conversion"
  | "personal";

/** Whether a tool is built yet or planned for a later phase. */
export type CalculatorStatus = "available" | "planned";

// ── Registry metadata ────────────────────────────────────────

/** Metadata describing a single calculator tool. */
export interface CalculatorMeta {
  id: CalculatorId;
  name: string;
  description: string;
  category: CalculatorCategory;
  /** Icon identifier resolved by the UI icon map. */
  icon: string;
  /** Search keywords and synonyms (PRD §5.1 search requirements). */
  keywords: string[];
  status: CalculatorStatus;
  /** Higher priority tools surface first. */
  priority?: "high" | "normal";
  /** App Router path for this tool. */
  route: string;
}

/** Category descriptor for the dashboard directory. */
export interface CategoryMeta {
  id: CalculatorCategory;
  name: string;
  description: string;
  icon: string;
}

// ── Calculation results ──────────────────────────────────────

/** Standard error shape returned by calculation services. */
export interface CalculationError {
  ok: false;
  error: string;
  /** Optional field-level errors for form validation. */
  fieldErrors?: Record<string, string>;
}

/** Standard success envelope for calculation results. */
export interface CalculationSuccess<T> {
  ok: true;
  data: T;
}

/** Discriminated union every calculation function should return. */
export type CalculationResult<T> = CalculationSuccess<T> | CalculationError;

// ── History & favourites (local, PRD §8) ────────────────────

/** A single history entry — identifies calculator, inputs, result, timestamp. */
export interface HistoryEntry {
  id: string;
  calculatorId: CalculatorId;
  calculatorName: string;
  title: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  /** Human-readable result summary shown in history list. */
  summary: string;
  createdAt: number;
}

/** A saved/named calculation the user can revisit. */
export interface SavedCalculation {
  id: string;
  calculatorId: CalculatorId;
  calculatorName: string;
  name: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  summary: string;
  createdAt: number;
  updatedAt: number;
}

// ── Shared search ────────────────────────────────────────────

/** Result shape for dashboard tool search. */
export interface SearchResult {
  tool: CalculatorMeta;
  score: number;
  /** Which keyword matched, for potential highlighting. */
  matchedOn: string;
}
