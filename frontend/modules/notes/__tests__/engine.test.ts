import { describe, expect, it } from "vitest";
import {
  createNote,
  createNotebook,
  deleteNotebookIn,
  inNotebook,
  matchesQuery,
  noteSnippet,
  noteTitle,
  normalizeContent,
  normalizeTitle,
  notebookCounts,
  reconcileNotes,
  renameNotebook,
  sortNotes,
  updateNote,
  viewNotes,
} from "../engine";
import {
  MAX_CONTENT_LENGTH,
  MAX_NOTEBOOK_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  type Note,
  type Notebook,
} from "../types";

/** Minimal note with sensible defaults; override per case. */
function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "",
    content: "",
    notebookId: null,
    pinned: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function notebook(id: string, name: string): Notebook {
  return { id, name, createdAt: 500 };
}

// ── Normalization & display helpers ──────────────────────────

describe("title / content normalization", () => {
  it("trims titles and clamps them to the limit", () => {
    expect(normalizeTitle("  Grocery list  ")).toBe("Grocery list");
    expect(normalizeTitle(`  ${"x".repeat(500)}  `)).toHaveLength(
      MAX_TITLE_LENGTH,
    );
  });

  it("clamps content without touching whitespace or line breaks", () => {
    expect(normalizeContent("  keep me\nexactly  ")).toBe("  keep me\nexactly  ");
    expect(normalizeContent("y".repeat(50000))).toHaveLength(MAX_CONTENT_LENGTH);
  });

  it("falls back to Untitled for empty titles", () => {
    expect(noteTitle(note({ title: "" }))).toBe("Untitled");
    expect(noteTitle(note({ title: "   " }))).toBe("Untitled");
    expect(noteTitle(note({ title: " Real " }))).toBe("Real");
  });

  it("snippets the first non-empty line of the body", () => {
    expect(noteSnippet(note({ content: "\n\n  milk and eggs\nmore" }))).toBe(
      "milk and eggs",
    );
    expect(noteSnippet(note({ content: "   \n  " }))).toBe("");
  });
});

// ── createNote ───────────────────────────────────────────────

describe("createNote", () => {
  it("creates an unpinned note with both timestamps at now", () => {
    const created = createNote(
      { title: " Hello ", content: "body", notebookId: null },
      "id-1",
      4242,
    );
    expect(created).toEqual({
      id: "id-1",
      title: "Hello",
      content: "body",
      notebookId: null,
      pinned: false,
      createdAt: 4242,
      updatedAt: 4242,
    });
  });

  it("clamps oversized fields on the way in", () => {
    const created = createNote(
      { title: "t".repeat(500), content: "c".repeat(50000), notebookId: null },
      "id-2",
      1,
    );
    expect(created.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(created.content).toHaveLength(MAX_CONTENT_LENGTH);
  });

  it("keeps the notebook it was filed under", () => {
    const created = createNote(
      { title: "t", content: "", notebookId: "nb-9" },
      "id-3",
      1,
    );
    expect(created.notebookId).toBe("nb-9");
  });
});

// ── updateNote ───────────────────────────────────────────────

describe("updateNote", () => {
  it("applies the patch and bumps updatedAt", () => {
    const base = note({ title: "old", updatedAt: 1000 });
    const next = updateNote(base, { title: "new" }, 2000);
    expect(next.title).toBe("new");
    expect(next.updatedAt).toBe(2000);
    expect(next.createdAt).toBe(1000);
  });

  it("a pin flip alone leaves both timestamps untouched", () => {
    const base = note({ pinned: false, updatedAt: 1000 });
    const next = updateNote(base, { pinned: true }, 9999);
    expect(next.pinned).toBe(true);
    expect(next.updatedAt).toBe(1000);
    expect(next.createdAt).toBe(1000);
  });

  it("a no-op edit (same value, whitespace aside) does not bump", () => {
    const base = note({ title: "Same", content: "body", updatedAt: 1000 });
    expect(updateNote(base, { title: " Same ", content: "body" }, 2000).updatedAt).toBe(
      1000,
    );
    expect(updateNote(base, { content: "body" }, 2000).updatedAt).toBe(1000);
  });

  it("moving to another notebook counts as a touch", () => {
    const base = note({ notebookId: null, updatedAt: 1000 });
    const next = updateNote(base, { notebookId: "nb-1" }, 2000);
    expect(next.notebookId).toBe("nb-1");
    expect(next.updatedAt).toBe(2000);
  });

  it("never mutates the original note", () => {
    const base = note({ title: "before" });
    updateNote(base, { title: "after", pinned: true }, 2000);
    expect(base.title).toBe("before");
    expect(base.pinned).toBe(false);
  });
});

// ── Search & filter ──────────────────────────────────────────

describe("matchesQuery", () => {
  const target = note({ title: "Grocery List", content: "buy OAT milk\neggs" });

  it("an empty or whitespace query matches everything", () => {
    expect(matchesQuery(target, "")).toBe(true);
    expect(matchesQuery(target, "   ")).toBe(true);
  });

  it("matches the title case-insensitively", () => {
    expect(matchesQuery(target, "grocery")).toBe(true);
    expect(matchesQuery(target, "LIST")).toBe(true);
    expect(matchesQuery(target, "shopping")).toBe(false);
  });

  it("matches the body across lines", () => {
    expect(matchesQuery(target, "oat milk")).toBe(true);
    expect(matchesQuery(target, "EGGS")).toBe(true);
    expect(matchesQuery(target, "oat milk eggs")).toBe(false);
  });

  it("trims the query before matching", () => {
    expect(matchesQuery(target, "  eggs  ")).toBe(true);
  });
});

describe("inNotebook", () => {
  const filed = note({ id: "a", notebookId: "nb-1" });
  const loose = note({ id: "b", notebookId: null });

  it("the all filter keeps everything", () => {
    expect(inNotebook(filed, "all")).toBe(true);
    expect(inNotebook(loose, "all")).toBe(true);
  });

  it("the unfiled filter keeps only notebook-less notes", () => {
    expect(inNotebook(loose, "unfiled")).toBe(true);
    expect(inNotebook(filed, "unfiled")).toBe(false);
  });

  it("an id filter keeps only that notebook's notes", () => {
    expect(inNotebook(filed, "nb-1")).toBe(true);
    expect(inNotebook(filed, "nb-2")).toBe(false);
    expect(inNotebook(loose, "nb-1")).toBe(false);
  });
});

// ── Ordering ─────────────────────────────────────────────────

describe("sortNotes", () => {
  it("pinned notes float to the top regardless of recency", () => {
    const old = note({ id: "old", pinned: true, updatedAt: 1, createdAt: 1 });
    const fresh = note({ id: "fresh", pinned: false, updatedAt: 999, createdAt: 1 });
    expect(sortNotes([fresh, old]).map((n) => n.id)).toEqual(["old", "fresh"]);
  });

  it("orders by updatedAt, then createdAt, then id", () => {
    const a = note({ id: "a", updatedAt: 10, createdAt: 5 });
    const b = note({ id: "b", updatedAt: 20, createdAt: 1 });
    const c = note({ id: "c", updatedAt: 10, createdAt: 5 });
    const d = note({ id: "d", updatedAt: 10, createdAt: 9 });
    expect(sortNotes([a, b, c, d]).map((n) => n.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [note({ id: "z", updatedAt: 1 }), note({ id: "a", updatedAt: 2 })];
    const idsBefore = input.map((n) => n.id);
    sortNotes(input);
    expect(input.map((n) => n.id)).toEqual(idsBefore);
  });
});

// ── viewNotes (filter + search + order) ──────────────────────

describe("viewNotes", () => {
  const notes: Note[] = [
    note({ id: "pinned", title: "Beta pinned", notebookId: "nb-1", pinned: true, updatedAt: 1 }),
    note({ id: "newest", title: "Beta plan", notebookId: "nb-1", updatedAt: 30 }),
    note({ id: "older", title: "Gamma", notebookId: "nb-1", updatedAt: 20 }),
    note({ id: "loose", title: "Beta loose", notebookId: null, updatedAt: 40 }),
  ];

  it("combines the notebook filter with the query", () => {
    const view = viewNotes(notes, "nb-1", "beta");
    expect(view.map((n) => n.id)).toEqual(["pinned", "newest"]);
  });

  it("keeps pinned order after filtering", () => {
    expect(viewNotes(notes, "all", "").map((n) => n.id)).toEqual([
      "pinned",
      "loose",
      "newest",
      "older",
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(viewNotes(notes, "unfiled", "zzz")).toEqual([]);
  });
});

// ── Notebooks ────────────────────────────────────────────────

describe("createNotebook", () => {
  it("creates a trimmed notebook", () => {
    const r = createNotebook("  Ideas  ", "nb-1", 100, []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.notebook).toEqual({ id: "nb-1", name: "Ideas", createdAt: 100 });
  });

  it("rejects an empty name", () => {
    const r = createNotebook("   ", "nb-1", 100, []);
    expect(r).toEqual({ ok: false, error: "Enter a notebook name" });
  });

  it("rejects a duplicate name case-insensitively", () => {
    const r = createNotebook("work", "nb-2", 100, [notebook("nb-1", "Work")]);
    expect(r).toEqual({ ok: false, error: "Notebook already exists" });
  });

  it("clamps long names", () => {
    const r = createNotebook("n".repeat(500), "nb-1", 100, []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.notebook.name).toHaveLength(MAX_NOTEBOOK_NAME_LENGTH);
  });
});

describe("renameNotebook", () => {
  const work = notebook("nb-1", "Work");
  const home = notebook("nb-2", "Home");

  it("renames with a trimmed name", () => {
    const r = renameNotebook(work, "  Job  ", [work, home]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.notebook.name).toBe("Job");
  });

  it("allows keeping the same name (self is not a duplicate)", () => {
    const r = renameNotebook(work, "Work", [work, home]);
    expect(r.ok).toBe(true);
  });

  it("rejects colliding with another notebook and empty names", () => {
    expect(renameNotebook(work, "home", [work, home])).toEqual({
      ok: false,
      error: "Notebook already exists",
    });
    expect(renameNotebook(work, " ", [work, home])).toEqual({
      ok: false,
      error: "Enter a notebook name",
    });
  });
});

describe("deleteNotebookIn", () => {
  it("drops the notebook and unhomes its notes without touching timestamps", () => {
    const notes = [
      note({ id: "a", notebookId: "nb-1", updatedAt: 111 }),
      note({ id: "b", notebookId: "nb-2", updatedAt: 222 }),
      note({ id: "c", notebookId: null, updatedAt: 333 }),
    ];
    const { notebooks, notes: kept } = deleteNotebookIn(
      [notebook("nb-1", "Work"), notebook("nb-2", "Home")],
      notes,
      "nb-1",
    );
    expect(notebooks.map((n) => n.id)).toEqual(["nb-2"]);
    expect(kept.find((n) => n.id === "a")).toMatchObject({
      notebookId: null,
      updatedAt: 111,
    });
    expect(kept.find((n) => n.id === "b")?.notebookId).toBe("nb-2");
    expect(kept.find((n) => n.id === "c")?.notebookId).toBeNull();
  });

  it("is a no-op for an unknown id (but returns fresh arrays)", () => {
    const notebooks = [notebook("nb-1", "Work")];
    const notes = [note({ id: "a", notebookId: "nb-1" })];
    const out = deleteNotebookIn(notebooks, notes, "ghost");
    expect(out.notebooks).toEqual(notebooks);
    expect(out.notes).toEqual(notes);
    expect(out.notebooks).not.toBe(notebooks);
  });
});

describe("reconcileNotes", () => {
  it("sends notes with a dead notebook id to Unfiled", () => {
    const notes = [
      note({ id: "a", notebookId: "gone" }),
      note({ id: "b", notebookId: "kept" }),
      note({ id: "c", notebookId: null }),
    ];
    const out = reconcileNotes(notes, [notebook("kept", "Still here")]);
    expect(out.map((n) => n.notebookId)).toEqual([null, "kept", null]);
  });

  it("keeps timestamps while reconciling", () => {
    const out = reconcileNotes([note({ id: "a", notebookId: "gone", updatedAt: 77 })], []);
    expect(out[0].updatedAt).toBe(77);
  });
});

describe("notebookCounts", () => {
  it("counts per notebook, unfiled and the total", () => {
    const counts = notebookCounts([
      note({ id: "a", notebookId: "nb-1" }),
      note({ id: "b", notebookId: "nb-1" }),
      note({ id: "c", notebookId: "nb-2" }),
      note({ id: "d", notebookId: null }),
    ]);
    expect(counts).toEqual({ byId: { "nb-1": 2, "nb-2": 1 }, unfiled: 1, all: 4 });
  });

  it("is zeroed for no notes", () => {
    expect(notebookCounts([])).toEqual({ byId: {}, unfiled: 0, all: 0 });
  });
});
