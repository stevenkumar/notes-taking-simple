import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export const metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracker"
        description="Log spending, categorise and view summaries"
        actions={<Badge variant="secondary">Phase 9</Badge>}
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Construction className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">Coming in Phase 9</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            The Expense Tracker will be built after the Calculator module
            reaches production readiness.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
