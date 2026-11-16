"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import type { NotebookCounts } from "../engine";
import {
  ALL_NOTEBOOKS,
  UNFILED_NOTEBOOK,
  type Notebook,
} from "../types";

interface NotebookRailProps {
  filter: string;
  notebooks: Notebook[];
  counts: NotebookCounts;
  /** Validation error from the last add/rename attempt (module-owned). */
  error: string | null;
  /** Notebook currently being renamed inline, or null. */
  editingId: string | null;
  onSelect: (filter: string) => void;
  /** Returns false (and surfaces `error`) when the name is invalid. */
  onAdd: (name: string) => boolean;
  onRename: (notebook: Notebook, name: string) => boolean;
  onDelete: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  className?: string;
}

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

/**
 * Notebook rail — filter shortcuts (All / Unfiled), the notebook list
 * with counts, inline rename, delete and an add form. On mobile it
 * stacks above the list so notebook management stays available.
 */
export function NotebookRail({
  filter,
  notebooks,
  counts,
  error,
  editingId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onStartEdit,
  onCancelEdit,
  className,
}: NotebookRailProps) {
  const [addName, setAddName] = useState("");

  const submitRename = (notebook: Notebook, raw: string) => {
    if (onRename(notebook, raw)) onCancelEdit();
  };

  return (
    <div
      className={cn(
        "flex-col gap-3 rounded-xl border border-border bg-card p-3",
        className,
      )}
    >
      <h2 className="px-1 text-sm font-semibold">Notebooks</h2>

      <nav aria-label="Notebook filter" className="flex max-h-40 flex-col gap-0.5 overflow-y-auto lg:max-h-none">
        <FilterRow
          label="All notes"
          count={counts.all}
          active={filter === ALL_NOTEBOOKS}
          onClick={() => onSelect(ALL_NOTEBOOKS)}
        />
        <FilterRow
          label="Unfiled"
          count={counts.unfiled}
          active={filter === UNFILED_NOTEBOOK}
          onClick={() => onSelect(UNFILED_NOTEBOOK)}
        />

        {notebooks.map((notebook) => (
          <div key={notebook.id} className="flex items-center gap-0.5">
            {editingId === notebook.id ? (
              <input
                autoFocus
                defaultValue={notebook.name}
                aria-label={`Rename notebook ${notebook.name}`}
                className={cn(
                  "h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm",
                  "focus:outline-none focus:ring-1 focus:ring-ring",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRename(notebook, e.currentTarget.value);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                onBlur={(e) => {
                  if (editingId === notebook.id) {
                    submitRename(notebook, e.currentTarget.value);
                  }
                }}
              />
            ) : (
              <>
                <FilterRow
                  label={notebook.name}
                  count={counts.byId[notebook.id] ?? 0}
                  active={filter === notebook.id}
                  onClick={() => onSelect(notebook.id)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label={`Rename notebook ${notebook.name}`}
                  onClick={() => onStartEdit(notebook.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete notebook ${notebook.name}`}
                  onClick={() => onDelete(notebook.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </nav>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (onAdd(addName)) setAddName("");
        }}
      >
        <Input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="New notebook"
          aria-label="New notebook name"
          className="h-9"
        />
        <Button type="submit" size="sm" className="h-9 shrink-0" aria-label="Add notebook">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {error && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
