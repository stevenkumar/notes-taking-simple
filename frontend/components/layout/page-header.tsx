import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  /** Right-aligned actions (buttons etc.). */
  actions?: ReactNode;
  className?: string;
}

/** Consistent page header used across all screens (PRD §9). */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        "mb-6",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
