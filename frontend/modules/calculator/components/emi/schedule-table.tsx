"use client";

import type { YearlySummaryRow } from "../../engine/emi-calculator";
import { formatCurrency } from "@/utils/format";

/**
 * Yearly amortisation table shown below the EMI result.
 * One row per loan year: principal repaid, interest paid, closing balance.
 */
export function ScheduleTable({ rows }: { rows: YearlySummaryRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="px-4 pt-4 pb-2 text-left text-base font-semibold">
          Amortisation schedule{" "}
          <span className="text-sm font-normal text-muted-foreground">(yearly)</span>
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">Year</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Principal</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Interest</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{row.year}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(row.principalPaid)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatCurrency(row.interestPaid)}
              </td>
              <td
                className={
                  row.closingBalance === 0
                    ? "px-4 py-2.5 text-right font-medium tabular-nums text-success"
                    : "px-4 py-2.5 text-right tabular-nums"
                }
              >
                {formatCurrency(row.closingBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
