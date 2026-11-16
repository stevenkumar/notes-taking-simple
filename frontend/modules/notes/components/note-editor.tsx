"use client";

import { ArrowLeft, FileText, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/history";
import { noteTitle, type NotePatch } from "../engine";
import { UNFILED_NOTEBOOK, type Note, type Notebook } from "../types";

interface NoteEditorProps {
  /** The note being edited, or null for the desktop empty state. */
  note: Note | null;
  notebooks: Notebook[];
  onPatch: (patch: NotePatch) => void;
  onDelete: () => void;
  /** Mobile back — returns to the list. */
  onBack: () => void;
  className?: string;
}

/**
 * Editing surface — title and plain-text body edit live (the module
 * debounces persistence), plus notebook move, pin, delete and the
 * edit-time footer. Empty state appears on desktop with no selection.
 */
export function NoteEditor({
  note,
  notebooks,
  onPatch,
  onDelete,
  onBack,
  className,
}: NoteEditorProps) {
  if (!note) {
    return (
      <div
        className={cn(
          "flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center",
          className,
        )}
      >
        <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Select a note to read or edit it — or press New note to start
          writing.
        </p>
      </div>
    );
  }

  const title = noteTitle(note);

  return (
    <div
      className={cn(
        "flex-col gap-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onBack}
          aria-label="Back to notes list"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Button>
        <span className="text-xs text-muted-foreground">
          Edited {timeAgo(note.updatedAt)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={note.pinned ? `Unpin note ${title}` : `Pin note ${title}`}
            onClick={() => onPatch({ pinned: !note.pinned })}
          >
            <Pin
              className={cn(
                "h-4 w-4",
                note.pinned && "fill-current text-primary",
              )}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete note"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* ── Notebook move + length ── */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="note-notebook"
          className="text-xs text-muted-foreground"
        >
          Notebook
        </label>
        <select
          id="note-notebook"
          value={note.notebookId ?? UNFILED_NOTEBOOK}
          onChange={(e) =>
            onPatch({
              notebookId:
                e.target.value === UNFILED_NOTEBOOK ? null : e.target.value,
            })
          }
          className={cn(
            "h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
          )}
        >
          <option value={UNFILED_NOTEBOOK}>Unfiled</option>
          {notebooks.map((nb) => (
            <option key={nb.id} value={nb.id}>
              {nb.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {note.content.length} characters
        </span>
      </div>

      {/* ── Title + body ── */}
      <input
        value={note.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="Untitled"
        aria-label="Note title"
        className={cn(
          "w-full bg-transparent text-xl font-semibold tracking-tight",
          "placeholder:text-muted-foreground focus:outline-none",
        )}
      />
      <textarea
        value={note.content}
        onChange={(e) => onPatch({ content: e.target.value })}
        placeholder="Start writing…"
        aria-label="Note content"
        className={cn(
          "min-h-[16rem] w-full flex-1 resize-y rounded-lg border border-input bg-background p-3 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          "lg:min-h-[22rem]",
        )}
      />
    </div>
  );
}
