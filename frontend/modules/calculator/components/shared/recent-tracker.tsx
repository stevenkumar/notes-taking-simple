"use client";

import { useEffect } from "react";
import { recordRecentTool } from "@/utils/tool-prefs";
import type { CalculatorId } from "@/modules/calculator/types";

/**
 * Records a tool visit for the dashboard's "Recent activity" list.
 * Mounted inside each available tool page and renders nothing.
 */
export function RecentTracker({ id }: { id: CalculatorId }) {
  useEffect(() => {
    recordRecentTool(id);
  }, [id]);

  return null;
}
