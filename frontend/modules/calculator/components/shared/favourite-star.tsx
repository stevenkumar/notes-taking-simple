"use client";

import { Star } from "lucide-react";
import { cn } from "@/utils/cn";

type Props = {
  /** Tool name used for the accessible label. */
  toolName: string;
  /** Whether the tool is currently starred. */
  active: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Star toggle shown on hub tool cards. The card itself is wrapped by a
 * stretched-link anchor, so the star sits above it (relative z-index) to
 * keep the button and the link as siblings instead of nesting interactive
 * elements.
 */
export function FavouriteStar({ toolName, active, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={
        active
          ? `Remove ${toolName} from favourites`
          : `Add ${toolName} to favourites`
      }
      title={active ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "relative z-20 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors",
        "hover:border-amber-500/50 hover:text-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "border-amber-500/50 text-amber-500",
        className,
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} aria-hidden="true" />
    </button>
  );
}
