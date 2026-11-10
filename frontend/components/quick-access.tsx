"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getCalculator } from "@/modules/calculator/registry/calculator-registry";
import {
  MAX_QUICK_TOOLS,
  loadFavourites,
  loadRecentTools,
} from "@/utils/tool-prefs";
import type { CalculatorMeta } from "@/modules/calculator/types";

type QuickTool = { href: string; label: string };

/**
 * Static fallback — also exactly what the server renders, so the first
 * client paint matches before storage is read post-mount.
 */
const DEFAULT_QUICK_TOOLS: QuickTool[] = [
  { href: "/calculator/basic", label: "Basic Calculator" },
  { href: "/calculator/discount", label: "Discount Calculator" },
  { href: "/calculator/gst", label: "GST Calculator" },
  { href: "/calculator/emi", label: "EMI Calculator" },
  { href: "/calculator/unit", label: "Unit Converter" },
  { href: "/calculator/percentage", label: "Percentage Calculator" },
];

/** Favourites first, then recent visits, then static defaults, capped. */
function buildQuickTools(): QuickTool[] {
  const seen = new Set<string>();
  const picked: QuickTool[] = [];

  const add = (meta: CalculatorMeta) => {
    if (seen.has(meta.route) || picked.length >= MAX_QUICK_TOOLS) return;
    seen.add(meta.route);
    picked.push({ href: meta.route, label: meta.name });
  };

  for (const id of [...loadFavourites(), ...loadRecentTools()]) {
    const meta = getCalculator(id);
    if (meta && meta.status === "available") add(meta);
  }

  for (const fallback of DEFAULT_QUICK_TOOLS) {
    if (picked.length >= MAX_QUICK_TOOLS) break;
    if (seen.has(fallback.href)) continue;
    seen.add(fallback.href);
    picked.push(fallback);
  }

  return picked;
}

export function QuickAccess() {
  const [tools, setTools] = useState<QuickTool[]>(DEFAULT_QUICK_TOOLS);

  useEffect(() => {
    setTools(buildQuickTools());
  }, []);

  return (
    <section aria-labelledby="quick-tools-heading">
      <h2 id="quick-tools-heading" className="text-sm font-medium text-muted-foreground mb-3">
        Quick access
      </h2>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {tool.label}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
