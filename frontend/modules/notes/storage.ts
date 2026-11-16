/**
 * Notes persistence — localStorage wrappers with shape validation.
 *
 * Corrupt, wrongly-typed or oversized payloads degrade to clean lists
 * instead of crashing the page (same hardening as tool-prefs): every
 * entry is re-validated on load, ids are de-duplicated, content is
 * re-clamped to the module limits and both lists are capped.
 *
 * `reconcileNotes` in the engine runs after load so notes pointing at
 * a deleted notebook surface under Unfiled instead of vanishing.
 */

import { getStorage, setStorage } from "@/utils/storage";
import {
  MAX_CONTENT_LENGTH,
  MAX_NOTES,
  MAX_NOTEBOOKS,
  MAX_NOTEBOOK_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  NOTES_STORAGE_KEY,
  NOTEBOOKS_STORAGE_KEY,
  type Note,
  type Notebook,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Re-validates one raw entry; null when unusable. */
function sanitizeNote(raw: unknown): Note | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || raw.id === "") return null;
  if (typeof raw.title !== "string" || typeof raw.content !== "string") {
    return null;
  }
  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : 0;
  return {
    id: raw.id,
    title: clamp(raw.title, MAX_TITLE_LENGTH),
    content: clamp(raw.content, MAX_CONTENT_LENGTH),
    notebookId:
      typeof raw.notebookId === "string" && raw.notebookId !== ""
        ? raw.notebookId
        : null,
    pinned: raw.pinned === true,
    createdAt,
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : createdAt,
  };
}

function sanitizeNotebook(raw: unknown): Notebook | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || raw.id === "") return null;
  if (typeof raw.name !== "string") return null;
  const name = clamp(raw.name.trim(), MAX_NOTEBOOK_NAME_LENGTH);
  if (!name) return null;
  return {
    id: raw.id,
    name,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : 0,
  };
}

function sanitizeList<T extends { id: string }>(
  raw: unknown,
  entry: (value: unknown) => T | null,
  cap: number,
): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = entry(item);
    if (parsed && !seen.has(parsed.id)) {
      seen.add(parsed.id);
      out.push(parsed);
      if (out.length >= cap) break;
    }
  }
  return out;
}

/** Reads and re-validates the note list; [] on any problem. */
export function loadNotes(): Note[] {
  return sanitizeList(getStorage<unknown>(NOTES_STORAGE_KEY, []), sanitizeNote, MAX_NOTES);
}

/** Writes the note list, capped at MAX_NOTES. Silent on quota errors. */
export function saveNotes(notes: readonly Note[]): void {
  setStorage(NOTES_STORAGE_KEY, notes.slice(0, MAX_NOTES));
}

/** Reads and re-validates the notebook list; [] on any problem. */
export function loadNotebooks(): Notebook[] {
  return sanitizeList(
    getStorage<unknown>(NOTEBOOKS_STORAGE_KEY, []),
    sanitizeNotebook,
    MAX_NOTEBOOKS,
  );
}

/** Writes the notebook list, capped at MAX_NOTEBOOKS. */
export function saveNotebooks(notebooks: readonly Notebook[]): void {
  setStorage(NOTEBOOKS_STORAGE_KEY, notebooks.slice(0, MAX_NOTEBOOKS));
}
