/**
 * Age Calculator — form state and mode metadata.
 * Forms hold raw date strings (controlled inputs); compute.ts parses them
 * through the engine's strict YYYY-MM-DD parser and validates.
 */

export type AgeModeId = "current" | "on-date" | "difference";

// ── Form state (raw input strings) ───────────────────────────

/**
 * Flat form shared across modes so switching tabs keeps what you typed.
 * `birthDate` serves modes A and B; `date` is mode B's reference day;
 * `first` / `second` are mode C's two birth dates.
 */
export interface AgeForm {
  birthDate: string;
  date: string;
  first: string;
  second: string;
}

/**
 * Stable initial state — birth date pre-filled so mode A shows a live
 * result on first paint; the other modes start with sensible examples.
 */
export const AGE_INITIAL_FORMS: AgeForm = {
  birthDate: "2000-01-01",
  date: "",
  first: "1990-05-10",
  second: "1992-08-20",
};

// ── Mode metadata ────────────────────────────────────────────

export interface AgeModeMeta {
  id: AgeModeId;
  /** Letter shown in the tab. */
  letter: string;
  label: string;
  /** Short hint rendered under the form title. */
  hint: string;
}

export const AGE_MODE_META: AgeModeMeta[] = [
  {
    id: "current",
    letter: "A",
    label: "Current Age",
    hint: "Age today from a date of birth, with the next-birthday countdown.",
  },
  {
    id: "on-date",
    letter: "B",
    label: "Age on Date",
    hint: "How old someone was (or will be) on any given date.",
  },
  {
    id: "difference",
    letter: "C",
    label: "Age Difference",
    hint: "Years apart between two birth dates, and who is older.",
  },
];
