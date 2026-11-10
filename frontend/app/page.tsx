import Link from "next/link";
import {
  Calculator,
  CheckSquare,
  FileText,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Greeting } from "@/components/greeting";
import { QuickAccess } from "@/components/quick-access";
import { RecentActivity } from "@/components/recent-activity";

const MODULES = [
  {
    href: "/calculator",
    title: "Calculator & Utilities",
    description: "GST, EMI, salary, profit, conversions and more — 13 tools and counting",
    icon: Calculator,
    accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    badge: "Available",
    badgeVariant: "success" as const,
  },
  {
    href: "/tasks",
    title: "To-Do Manager",
    description: "Organise tasks, set priorities and track progress",
    icon: CheckSquare,
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "Coming soon",
    badgeVariant: "secondary" as const,
  },
  {
    href: "/notes",
    title: "Notes & Notebook",
    description: "Capture ideas, lists and everything in between",
    icon: FileText,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "Coming soon",
    badgeVariant: "secondary" as const,
  },
  {
    href: "/planner",
    title: "Daily Planner",
    description: "Plan your day, week and important deadlines",
    icon: CalendarDays,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badge: "Coming soon",
    badgeVariant: "secondary" as const,
  },
  {
    href: "/expenses",
    title: "Expense Tracker",
    description: "Log spending, categorise and view summaries",
    icon: Wallet,
    accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    badge: "Coming soon",
    badgeVariant: "secondary" as const,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={<Greeting />}
        description="What would you like to do today?"
      />

      {/* Quick tools row — favourites first, then recents, then defaults */}
      <QuickAccess />

      {/* Module grid */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-sm font-medium text-muted-foreground mb-3">
          Modules
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <Link key={mod.href} href={mod.href} className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl">
              <Card className="h-full transition-all duration-150 group-hover:shadow-md group-hover:border-primary/30">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${mod.accent}`}>
                      <mod.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge variant={mod.badgeVariant}>{mod.badge}</Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {mod.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity — most recently visited tools (placeholder when empty) */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-heading" className="text-sm font-medium text-muted-foreground">
            Recent activity
          </h2>
        </div>
        <RecentActivity />
      </section>
    </div>
  );
}
