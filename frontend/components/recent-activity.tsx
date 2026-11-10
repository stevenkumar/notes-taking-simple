"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ToolIcon } from "@/modules/calculator/components/shared/tool-icon";
import { getCalculator } from "@/modules/calculator/registry/calculator-registry";
import { loadRecentTools } from "@/utils/tool-prefs";
import type { CalculatorId, CalculatorMeta } from "@/modules/calculator/types";

/** Shown before any tool has been visited. */
function EmptyRecent() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
          <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">No recent activity yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Your calculations, tasks and notes will show up here as you use the app.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard widget: calculators visited most recently, newest first.
 * Reads storage post-mount so the server render (empty list) always matches.
 */
export function RecentActivity() {
  const [ids, setIds] = useState<CalculatorId[]>([]);

  useEffect(() => {
    setIds(loadRecentTools());
  }, []);

  const tools: CalculatorMeta[] = [];
  for (const id of ids) {
    const meta = getCalculator(id);
    if (meta && meta.status === "available") tools.push(meta);
  }

  if (tools.length === 0) return <EmptyRecent />;

  return (
    <Card>
      <CardContent className="py-2">
        <ul>
          {tools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.route}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ToolIcon name={tool.icon} className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tool.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
