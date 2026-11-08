/**
 * Date & Time Calculator — form state and mode metadata.
 * Forms hold raw strings (controlled inputs); compute.ts parses dates
 * through the engine's strict YYYY-MM-DD parser and validates amounts.
 */

export type DateTimeModeId =
  | "difference"
  | "add-days"
  | "working-days"
  | "countdown";

export type DayDirection = "add" | "subtract";

// ── Form state (raw input strings) ───────────────────────────

/**
 * Flat form shared across modes so switching tabs keeps what you typed.
 * `from`/`to` serve modes A and C, `date` + `amount` + `direction`
 * drive mode B, and `target` is mode D's countdown date.
 */
export interface DateTimeForm {
  from: string;
  to: string;
  date: string;
  amount: string;
  direction: DayDirection;
  target: string;
}

/**
 * Stable initial state — every mode pre-filled with a fixed example so
 * it shows a live result on first paint (the countdown refreshes itself
 * daily because its "today" comes from the component).
 */
export const DATETIME_INITIAL_FORMS: DateTimeForm = {
  from: "2026-01-01",
  to: "2026-12-31",
  date: "2026-01-01",
  amount: "100",
  direction: "add",
  target: "2027-01-01",
};

// ── Mode metadata ────────────────────────────────────────────

export interface DateTimeModeMeta {
  id: DateTimeModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
  /** Short hint rendered under the form title. */
  hint: string;
}

export const DATETIME_MODE_META: DateTimeModeMeta[] = [
  {
    id: "difference",
    letter: "A",
    label: "Date Difference",
    hint: "Years, months and days between two dates — order does not matter.",
  },
  {
    id: "add-days",
    letter: "B",
    label: "Add / Subtract Days",
    hint: "Shift any date forward or backward by a whole number of days.",
  },
  {
    id: "working-days",
    letter: "C",
    label: "Working Days",
    hint: "Monday–Friday days between two dates, counting both endpoints.",
  },
  {
    id: "countdown",
    letter: "D",
    label: "Countdown",
    hint: "Days remaining until a target date, updated live from today.",
  },
];
