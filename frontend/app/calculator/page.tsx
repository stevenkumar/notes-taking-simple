"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Calculator,
  FlaskConical,
  Percent,
  Banknote,
  ShoppingCart,
  Tag,
  Landmark,
  TrendingUp,
  CakeSlice,
  CalendarDays,
  ArrowLeftRight,
  Coins,
  Wallet,
  BarChart3,
  Equal,
  Users,
  HeartPulse,
  Fuel,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import {
  CATEGORIES,
  CALCULATORS,
  searchCalculators,
  getCalculatorsByCategory,
} from "@/modules/calculator/registry/calculator-registry";
import type { CalculatorMeta, CalculatorCategory } from "@/modules/calculator/types";

/** Icon resolver for tool/category icons. */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  flask: FlaskConical,
  percent: Percent,
  banknote: Banknote,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  landmark: Landmark,
  "trending-up": TrendingUp,
  cake: CakeSlice,
  calendar: CalendarDays,
  "arrow-left-right": ArrowLeftRight,
  coins: Coins,
  wallet: Wallet,
  chart: BarChart3,
  equal: Equal,
  users: Users,
  heart: HeartPulse,
  fuel: Fuel,
  zap: Zap,
};

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ICONS.calculator!;
  return <Icon className={className} />;
}

const EXAMPLE_QUERIES = [
  "How much GST?",
  "Monthly loan payment",
  "20% off",
  "Convert kg to pounds",
  "Age from date of birth",
];

export default function CalculatorDashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CalculatorCategory | "all">("all");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchCalculators(query), [query]);

  const filteredTools = useMemo(() => {
    if (activeCategory === "all") {
      return CALCULATORS.filter((c) => c.status === "available");
    }
    return getCalculatorsByCategory(activeCategory).filter(
      (c) => c.status === "available",
    );
  }, [activeCategory]);

  const showResults = query.trim().length > 0;

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [results]);

  const openTool = useCallback(
    (tool: CalculatorMeta) => {
      router.push(tool.route);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightIndex >= 0 ? highlightIndex : 0;
      if (results[idx]) openTool(results[idx].tool);
    } else if (e.key === "Escape") {
      setQuery("");
      setHighlightIndex(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calculator & Utilities"
        description="Search or browse 11 calculation tools across 7 categories"
      />

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try "How much GST?" or "20% off"...'
            aria-label="Search calculators"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-expanded={showResults}
            className="h-12 pl-10 pr-10 text-base rounded-xl"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && (
          <div
            id="search-results"
            role="listbox"
            ref={listRef}
            className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
          >
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-medium">No tools match &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different term, or browse categories below.
                </p>
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.tool.id}
                  role="option"
                  aria-selected={i === highlightIndex}
                  onClick={() => openTool(r.tool)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    i === highlightIndex ? "bg-accent" : "hover:bg-muted",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ToolIcon name={r.tool.icon} className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.tool.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.tool.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Example queries (when search is empty) */}
      {!showResults && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Categories */}
      {!showResults && (
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-sm font-medium text-muted-foreground mb-3">
            Categories
          </h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool categories">
            <button
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              All tools
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tool grid */}
      {!showResults && (
        <section aria-labelledby="tools-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="tools-heading" className="text-sm font-medium text-muted-foreground">
              {activeCategory === "all"
                ? "All calculators"
                : CATEGORIES.find((c) => c.id === activeCategory)?.name}
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredTools.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No tools in this category yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.route}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl"
                >
                  <Card className="h-full transition-all duration-150 group-hover:shadow-md group-hover:border-primary/30">
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ToolIcon name={tool.icon} className="h-5 w-5" />
                        </div>
                        {tool.priority === "high" && (
                          <Badge variant="warning">Popular</Badge>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {tool.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        Open tool
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
