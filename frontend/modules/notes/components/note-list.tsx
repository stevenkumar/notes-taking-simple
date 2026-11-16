"use client";

import { FileText, Pin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/history";
import { noteSnippet, noteTitle } from "../engine";
import type { Note } from "../types";

interface NoteListProps {
  /** Already filtered + sorted by the engine's viewNotes. */
  notes: Note[];
  activeId: string | null;
  /** True when the account holds any note at all (empty-state copy differs). */
  hasAnyNotes: boolean;
  query: string;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onQueryChange: (query: string) => void;
  onNew: () => void;
  className?: string;
}

/**
 * Searchable note list — first panel of the workspace. Each row shows
 * the display title, the first body line and the edit time; a pin
 * toggle floats the note without opening it.
 */
export function NoteList({
  notes,
  activeId,
  hasAnyNotes,
  query,
  onSelect,
  onTogglePin,
  onQueryChange,
  onNew,
  className,
}: NoteListProps) {
  return (
    <div
      className={cn(
        "flex-col gap-3 rounded-xl border border-border bg-card p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Notes</h2>
        <Button size="sm" onClick={onNew} aria-label="New note">
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          New note
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search notes…"
        aria-label="Search notes"
        prefix={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
      />

      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {hasAnyNotes
              ? "No notes match this view."
              : "No notes yet — press New note to write your first."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note) => {
            const active = note.id === activeId;
            const title = noteTitle(note);
            return (
              <li
                key={note.id}
                className="flex items-stretch gap-0.5 rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "min-w-0 flex-1 rounded-l-lg p-3 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {note.pinned && (
                      <Pin
                        className="h-3 w-3 shrink-0 fill-current text-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate text-sm font-medium">{title}</span>
                    <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
                      {timeAgo(note.updatedAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {noteSnippet(note) || "Empty note"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePin(note.id)}
                  aria-label={
                    note.pinned ? `Unpin note ${title}` : `Pin note ${title}`
                  }
                  className="rounded-r-lg px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pin
                    className={cn(
                      "h-3.5 w-3.5",
                      note.pinned && "fill-current text-primary",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
