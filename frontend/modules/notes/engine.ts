/**
 * Notes engine — pure functions over notes and notebooks.
 *
 * No clock, no randomness, no storage: the caller injects ids and
 * timestamps so every path stays deterministic and unit-testable.
 * Mutations return new records; validation returns small discriminated
 * results and never throws.
 *
 * View model: `viewNotes` is the one call the list UI needs — it
 * applies the notebook filter, the case-insensitive search over title
 * and body, and the display order (pinned first, newest edit first).
 */

import {
  ALL_NOTEBOOKS,
  MAX_CONTENT_LENGTH,
  MAX_NOTEBOOK_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  UNFILED_NOTEBOOK,
  UNTITLED_NOTE,
  type Note,
  type Notebook,
} from "./types";

// ── Normalization ────────────────────────────────────────────

function clamp(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Trimmed + length-clamped title as stored on a note. */
export function normalizeTitle(raw: string): string {
  return clamp(raw.trim(), MAX_TITLE_LENGTH);
}

/** Length-clamped body (content keeps its line breaks, only clamped). */
export function normalizeContent(raw: string): string {
  return clamp(raw, MAX_CONTENT_LENGTH);
}

/** Display title — empty titles render as "Untitled". */
export function noteTitle(note: Note): string {
  return note.title.trim() || UNTITLED_NOTE;
}

/** First non-empty line of the body for the list preview ("" when blank). */
export function noteSnippet(note: Note): string {
  for (const line of note.content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

// ── Note mutations ───────────────────────────────────────────

export interface NoteDraft {
  title: string;
  content: string;
  notebookId: string | null;
}

/** Builds a new note with both timestamps set to `now`. */
export function createNote(draft: NoteDraft, id: string, now: number): Note {
  return {
    id,
    title: normalizeTitle(draft.title),
    content: normalizeContent(draft.content),
    notebookId: draft.notebookId,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Fields a caller may patch on an existing note. */
export type NotePatch = Partial<
  Pick<Note, "title" | "content" | "notebookId" | "pinned">
>;

/**
 * Applies a patch as a new record. `updatedAt` only bumps when the
 * title, body or notebook actually changes — a pin flip or a no-op
 * edit leaves the timestamp (and therefore the sort order) alone.
 */
export function updateNote(note: Note, patch: NotePatch, now: number): Note {
  const next: Note = { ...note };
  if (patch.title !== undefined) next.title = normalizeTitle(patch.title);
  if (patch.content !== undefined) next.content = normalizeContent(patch.content);
  if (patch.notebookId !== undefined) next.notebookId = patch.notebookId;
  if (patch.pinned !== undefined) next.pinned = patch.pinned;

  const touched =
    next.title !== note.title ||
    next.content !== note.content ||
    next.notebookId !== note.notebookId;
  if (touched) next.updatedAt = now;
  return next;
}

// ── Search, filter, order ────────────────────────────────────

/** Case-insensitive substring match over title and body; empty query matches all. */
export function matchesQuery(note: Note, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return (
    note.title.toLowerCase().includes(query) ||
    note.content.toLowerCase().includes(query)
  );
}

/** Keeps notes belonging to the filter ("all" | "unfiled" | notebook id). */
export function inNotebook(note: Note, filter: string): boolean {
  if (filter === ALL_NOTEBOOKS) return true;
  if (filter === UNFILED_NOTEBOOK) return note.notebookId === null;
  return note.notebookId === filter;
}

/**
 * Display order: pinned first, then most recently edited, then newest
 * created, with the id as a stable final tie-break. Never mutates.
 */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** The list the UI renders: notebook filter + search + display order. */
export function viewNotes(
  notes: readonly Note[],
  filter: string,
  query: string,
): Note[] {
  return sortNotes(
    notes.filter((note) => inNotebook(note, filter) && matchesQuery(note, query)),
  );
}

// ── Notebook operations ──────────────────────────────────────

export type NotebookResult =
  | { ok: true; notebook: Notebook }
  | { ok: false; error: string };

/**
 * New notebook with a trimmed, clamped, non-empty name. Names are
 * unique case-insensitively so the rail never shows two "Work" rows.
 */
export function createNotebook(
  name: string,
  id: string,
  now: number,
  existing: readonly Notebook[],
): NotebookResult {
  const trimmed = clamp(name.trim(), MAX_NOTEBOOK_NAME_LENGTH);
  if (!trimmed) return { ok: false, error: "Enter a notebook name" };
  if (existing.some((n) => n.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "Notebook already exists" };
  }
  return { ok: true, notebook: { id, name: trimmed, createdAt: now } };
}

/** Renames a notebook (duplicate check skips the notebook itself). */
export function renameNotebook(
  notebook: Notebook,
  name: string,
  existing: readonly Notebook[],
): NotebookResult {
  const trimmed = clamp(name.trim(), MAX_NOTEBOOK_NAME_LENGTH);
  if (!trimmed) return { ok: false, error: "Enter a notebook name" };
  const duplicate = existing.some(
    (n) => n.id !== notebook.id && n.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) return { ok: false, error: "Notebook already exists" };
  return { ok: true, notebook: { ...notebook, name: trimmed } };
}

/**
 * Deleting a notebook files its notes under Unfiled — note timestamps
 * are untouched because no note content changed. Unknown ids are a
 * no-op (both lists come back as fresh arrays).
 */
export function deleteNotebookIn(
  notebooks: readonly Notebook[],
  notes: readonly Note[],
  id: string,
): { notebooks: Notebook[]; notes: Note[] } {
  return {
    notebooks: notebooks.filter((n) => n.id !== id),
    notes: notes.map((note) =>
      note.notebookId === id ? { ...note, notebookId: null } : note,
    ),
  };
}

/**
 * Load-time hardening: notes whose notebook no longer exists fall
 * back to Unfiled so they never disappear behind a dead filter.
 */
export function reconcileNotes(
  notes: readonly Note[],
  notebooks: readonly Notebook[],
): Note[] {
  const ids = new Set(notebooks.map((n) => n.id));
  return notes.map((note) =>
    note.notebookId !== null && !ids.has(note.notebookId)
      ? { ...note, notebookId: null }
      : note,
  );
}

// ── Counts ───────────────────────────────────────────────────

export interface NotebookCounts {
  /** Per-notebook note counts keyed by notebook id. */
  byId: Record<string, number>;
  unfiled: number;
  all: number;
}

/** Rail badges: total, unfiled and per-notebook counts. */
export function notebookCounts(notes: readonly Note[]): NotebookCounts {
  const counts: NotebookCounts = { byId: {}, unfiled: 0, all: notes.length };
  for (const note of notes) {
    if (note.notebookId === null) {
      counts.unfiled += 1;
    } else {
      counts.byId[note.notebookId] = (counts.byId[note.notebookId] ?? 0) + 1;
    }
  }
  return counts;
}
