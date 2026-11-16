/**
 * Notes module — data contracts and limits.
 *
 * Notes and notebooks are plain local records: raw strings in, epoch-ms
 * timestamps out, persisted to localStorage (local-first, no backend).
 * Content is plain text — line breaks are preserved, no markup engine.
 */

/** A single note. */
export interface Note {
  id: string;
  /** User title (trimmed on save); empty means "Untitled" when displayed. */
  title: string;
  /** Plain-text body, line breaks preserved. */
  content: string;
  /** Owning notebook id, or null for the Unfiled bucket. */
  notebookId: string | null;
  /** Pinned notes sort to the top of every view. */
  pinned: boolean;
  createdAt: number;
  /** Epoch ms of the last content/title/notebook change (pin flips do not bump it). */
  updatedAt: number;
}

/** A notebook (folder) that groups notes. */
export interface Notebook {
  id: string;
  name: string;
  createdAt: number;
}

/** Well-known notebook filters — generated note ids can never collide. */
export const ALL_NOTEBOOKS = "all";
export const UNFILED_NOTEBOOK = "unfiled";

/** Display fallback when a note has no title. */
export const UNTITLED_NOTE = "Untitled";

// ── Limits (documented, enforced by the engine and storage) ──

/** Hard cap on persisted notes — bounds localStorage worst-case size. */
export const MAX_NOTES = 300;
/** Hard cap on persisted notebooks. */
export const MAX_NOTEBOOKS = 50;
/** Titles are clamped to this many characters. */
export const MAX_TITLE_LENGTH = 120;
/** Body content is clamped to this many characters. */
export const MAX_CONTENT_LENGTH = 10000;
/** Notebook names are clamped to this many characters. */
export const MAX_NOTEBOOK_NAME_LENGTH = 60;

/** localStorage keys for the module (namespaced like the rest of the app). */
export const NOTES_STORAGE_KEY = "everyday:notes";
export const NOTEBOOKS_STORAGE_KEY = "everyday:notebooks";
