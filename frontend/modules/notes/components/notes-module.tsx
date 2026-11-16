"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNote,
  createNotebook,
  deleteNotebookIn,
  notebookCounts,
  reconcileNotes,
  renameNotebook,
  updateNote,
  viewNotes,
  type NotePatch,
} from "../engine";
import {
  loadNotebooks,
  loadNotes,
  saveNotebooks,
  saveNotes,
} from "../storage";
import {
  ALL_NOTEBOOKS,
  UNFILED_NOTEBOOK,
  type Note,
  type Notebook,
} from "../types";
import { NotebookRail } from "./notebook-rail";
import { NoteList } from "./note-list";
import { NoteEditor } from "./note-editor";

/**
 * Notes workspace — owns all state and persistence. Three panels on
 * desktop (notebooks | list | editor) that collapse to a stacked
 * flow on mobile: picking a note swaps the list for the editor with
 * a Back button, the rail stays reachable above it.
 *
 * Persistence is debounced (300 ms) so typing never blocks on
 * localStorage; the initial load runs in an effect to keep the first
 * client render identical to the server HTML.
 */
export function NotesModule() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL_NOTEBOOKS);
  const [query, setQuery] = useState("");
  const [notebookError, setNotebookError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // One-time load (server rendered the empty defaults).
  useEffect(() => {
    const loaded = loadNotebooks();
    setNotebooks(loaded);
    setNotes(reconcileNotes(loadNotes(), loaded));
  }, []);

  // Debounced persistence — no setState here, so no hydration flash.
  useEffect(() => {
    const timer = window.setTimeout(() => saveNotes(notes), 300);
    return () => window.clearTimeout(timer);
  }, [notes]);
  useEffect(() => {
    const timer = window.setTimeout(() => saveNotebooks(notebooks), 300);
    return () => window.clearTimeout(timer);
  }, [notebooks]);

  const counts = useMemo(() => notebookCounts(notes), [notes]);
  const visible = useMemo(
    () => viewNotes(notes, filter, query),
    [notes, filter, query],
  );
  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  // ── Notes ──────────────────────────────────────────────────

  const handleNew = () => {
    const notebookId =
      filter !== ALL_NOTEBOOKS && filter !== UNFILED_NOTEBOOK ? filter : null;
    const created = createNote(
      { title: "", content: "", notebookId },
      makeId("note"),
      Date.now(),
    );
    setNotes((prev) => [created, ...prev]);
    setQuery(""); // the new note must be visible under any search
    setActiveId(created.id);
  };

  const handlePatchActive = (patch: NotePatch) => {
    if (!activeId) return;
    const id = activeId;
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? updateNote(n, patch, Date.now()) : n)),
    );
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? updateNote(n, { pinned: !n.pinned }, Date.now()) : n,
      ),
    );
  };

  const handleDeleteActive = () => {
    if (!activeId) return;
    const id = activeId;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setActiveId(null);
  };

  // ── Notebooks ──────────────────────────────────────────────

  const handleAddNotebook = (name: string): boolean => {
    const result = createNotebook(name, makeId("nb"), Date.now(), notebooks);
    if (!result.ok) {
      setNotebookError(result.error);
      return false;
    }
    setNotebooks((prev) => [...prev, result.notebook]);
    setNotebookError(null);
    return true;
  };

  const handleRenameNotebook = (notebook: Notebook, name: string): boolean => {
    const result = renameNotebook(notebook, name, notebooks);
    if (!result.ok) {
      setNotebookError(result.error);
      return false;
    }
    setNotebooks((prev) =>
      prev.map((n) => (n.id === notebook.id ? result.notebook : n)),
    );
    setNotebookError(null);
    return true;
  };

  const handleDeleteNotebook = (id: string) => {
    const out = deleteNotebookIn(notebooks, notes, id);
    setNotebooks(out.notebooks);
    setNotes(out.notes);
    if (filter === id) setFilter(ALL_NOTEBOOKS);
    if (editingId === id) setEditingId(null);
    setNotebookError(null);
  };

  const startEdit = (id: string) => {
    setEditingId(id);
    setNotebookError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNotebookError(null);
  };

  // ── Layout ─────────────────────────────────────────────────

  return (
    <div className="grid gap-4 lg:grid-cols-[13rem_20rem_minmax(0,1fr)]">
      <NotebookRail
        filter={filter}
        notebooks={notebooks}
        counts={counts}
        error={notebookError}
        editingId={editingId}
        onSelect={(next) => {
          setFilter(next);
          setNotebookError(null);
        }}
        onAdd={handleAddNotebook}
        onRename={handleRenameNotebook}
        onDelete={handleDeleteNotebook}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
      />
      <NoteList
        className={activeId ? "hidden lg:flex" : "flex"}
        notes={visible}
        activeId={activeId}
        hasAnyNotes={notes.length > 0}
        query={query}
        onSelect={setActiveId}
        onTogglePin={handleTogglePin}
        onQueryChange={setQuery}
        onNew={handleNew}
      />
      <NoteEditor
        className={activeId ? "flex" : "hidden lg:flex"}
        note={activeNote}
        notebooks={notebooks}
        onPatch={handlePatchActive}
        onDelete={handleDeleteActive}
        onBack={() => setActiveId(null)}
      />
    </div>
  );
}

/** Ids for notes and notebooks — randomUUID needs a secure context. */
function makeId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}
