import { beforeEach, describe, expect, it } from "vitest";
import {
  loadNotebooks,
  loadNotes,
  saveNotebooks,
  saveNotes,
} from "../storage";
import {
  MAX_NOTES,
  MAX_NOTEBOOKS,
  MAX_TITLE_LENGTH,
  NOTES_STORAGE_KEY,
  NOTEBOOKS_STORAGE_KEY,
  type Note,
} from "../types";

// ── Browser shims (vitest runs in node; storage.ts guards on window) ──

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = mock;
});

function rawNote(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "n1",
    title: "Hello",
    content: "body",
    notebookId: null,
    pinned: false,
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}

// ── Notes ────────────────────────────────────────────────────

describe("loadNotes", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadNotes()).toEqual([]);
  });

  it("survives corrupt or wrongly-shaped storage", () => {
    store.set(NOTES_STORAGE_KEY, "{not json");
    expect(loadNotes()).toEqual([]);
    store.set(NOTES_STORAGE_KEY, '"a note"');
    expect(loadNotes()).toEqual([]);
    store.set(NOTES_STORAGE_KEY, '{"id":"n1"}');
    expect(loadNotes()).toEqual([]);
    store.set(NOTES_STORAGE_KEY, "[7, null, true]");
    expect(loadNotes()).toEqual([]);
  });

  it("keeps valid entries and repairs soft fields", () => {
    store.set(
      NOTES_STORAGE_KEY,
      JSON.stringify([
        rawNote(),
        rawNote({ id: "n2", notebookId: 42, pinned: "yes", updatedAt: "soon" }),
        rawNote({ id: "n3", title: "x".repeat(500) }),
        { id: "", title: "no id" },
        { title: "no id field", content: "" },
      ]),
    );
    const notes = loadNotes();
    expect(notes.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
    // Garbage notebookId falls back to Unfiled, junk pinned to false,
    // a missing updatedAt falls back to createdAt, long titles clamp.
    expect(notes[1]).toMatchObject({ notebookId: null, pinned: false, updatedAt: 10 });
    expect(notes[2].title).toHaveLength(MAX_TITLE_LENGTH);
  });

  it("de-duplicates ids, first entry wins", () => {
    store.set(
      NOTES_STORAGE_KEY,
      JSON.stringify([rawNote({ id: "dup", title: "first" }), rawNote({ id: "dup", title: "second" })]),
    );
    const notes = loadNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("first");
  });

  it("caps the list at MAX_NOTES", () => {
    const entries = Array.from({ length: MAX_NOTES + 5 }, (_, i) =>
      rawNote({ id: `n${i}` }),
    );
    store.set(NOTES_STORAGE_KEY, JSON.stringify(entries));
    expect(loadNotes()).toHaveLength(MAX_NOTES);
  });
});

describe("saveNotes", () => {
  it("round-trips through loadNotes", () => {
    const notes: Note[] = [
      {
        id: "n1",
        title: "  spaced  ",
        content: "line1\nline2",
        notebookId: "nb-1",
        pinned: true,
        createdAt: 1,
        updatedAt: 2,
      },
    ];
    saveNotes(notes);
    expect(loadNotes()).toEqual(notes);
  });

  it("writes at most MAX_NOTES entries", () => {
    const notes = Array.from({ length: MAX_NOTES + 10 }, (_, i) => ({
      id: `n${i}`,
      title: "",
      content: "",
      notebookId: null,
      pinned: false,
      createdAt: i,
      updatedAt: i,
    }));
    saveNotes(notes);
    const stored = JSON.parse(store.get(NOTES_STORAGE_KEY)!) as unknown[];
    expect(stored).toHaveLength(MAX_NOTES);
  });

  it("overwrites the previous payload", () => {
    saveNotes([
      { id: "a", title: "", content: "", notebookId: null, pinned: false, createdAt: 1, updatedAt: 1 },
    ]);
    saveNotes([]);
    expect(loadNotes()).toEqual([]);
  });
});

// ── Notebooks ────────────────────────────────────────────────

describe("notebooks persistence", () => {
  it("returns [] for missing, corrupt or wrongly-shaped storage", () => {
    expect(loadNotebooks()).toEqual([]);
    store.set(NOTEBOOKS_STORAGE_KEY, "oops");
    expect(loadNotebooks()).toEqual([]);
    store.set(NOTEBOOKS_STORAGE_KEY, '{"nb-1":"Work"}');
    expect(loadNotebooks()).toEqual([]);
  });

  it("keeps valid notebooks, trims names and drops blank ones", () => {
    store.set(
      NOTEBOOKS_STORAGE_KEY,
      JSON.stringify([
        { id: "nb-1", name: "  Work  ", createdAt: 5 },
        { id: "nb-2", name: "   ", createdAt: 6 },
        { id: "", name: "Ghost" },
        { id: "nb-3", name: 42, createdAt: 7 },
        { id: "nb-4", name: "Home" },
      ]),
    );
    expect(loadNotebooks().map((n) => n.id)).toEqual(["nb-1", "nb-4"]);
    expect(loadNotebooks()[0].name).toBe("Work");
  });

  it("caps the list at MAX_NOTEBOOKS", () => {
    const entries = Array.from({ length: MAX_NOTEBOOKS + 3 }, (_, i) => ({
      id: `nb${i}`,
      name: `Book ${i}`,
      createdAt: i,
    }));
    store.set(NOTEBOOKS_STORAGE_KEY, JSON.stringify(entries));
    expect(loadNotebooks()).toHaveLength(MAX_NOTEBOOKS);
  });

  it("round-trips saveNotebooks", () => {
    saveNotebooks([{ id: "nb-1", name: "Ideas", createdAt: 42 }]);
    expect(loadNotebooks()).toEqual([{ id: "nb-1", name: "Ideas", createdAt: 42 }]);
  });
});
