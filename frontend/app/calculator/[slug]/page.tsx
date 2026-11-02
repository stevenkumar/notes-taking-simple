import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Construction, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCalculator } from "@/modules/calculator/registry/calculator-registry";
import type { CalculatorId } from "@/modules/calculator/types";

const VALID_IDS: CalculatorId[] = [
  "basic", "scientific", "gst", "emi", "interest", "percentage",
  "discount", "age", "date-time", "unit", "currency",
  "salary", "profit-loss", "ratio", "split-bill", "bmi", "fuel", "electricity",
];

/** Pre-render every known calculator page at build time. */
export function generateStaticParams() {
  return VALID_IDS.map((slug) => ({ slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tool = getCalculator(slug as CalculatorId);
  if (!tool) return { title: "Calculator not found" };
  return {
    title: tool.name,
    description: tool.description,
  };
}

export default async function CalculatorToolPage({ params }: Props) {
  const { slug } = await params;

  if (!VALID_IDS.includes(slug as CalculatorId)) {
    notFound();
  }

  const tool = getCalculator(slug as CalculatorId);
  if (!tool) notFound();

  const isPlanned = tool.status === "planned";

  return (
    <div className="space-y-6">
      <Link
        href="/calculator"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All calculators
      </Link>

      <PageHeader
        title={tool.name}
        description={tool.description}
        actions={
          tool.priority === "high" ? (
            <Badge variant="warning">High priority</Badge>
          ) : undefined
        }
      />

      {isPlanned ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <Construction className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold">Coming soon</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              This calculator is planned for a future phase. The Discount,
              GST, EMI and other core tools are being built first.
            </p>
            <Link href="/calculator" className="mt-5">
              <Button variant="outline">Browse available tools</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Star className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold">
              {tool.name} — under construction
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              The routing, metadata and registry are ready. The interactive UI
              and calculation engine arrive in Phase 3 of the roadmap.
            </p>
            <div className="mt-5 flex gap-2">
              <Link href="/calculator">
                <Button variant="outline">Back to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
