"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calculator,
  CheckSquare,
  FileText,
  CalendarDays,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/expenses", label: "Expenses", icon: Wallet },
] as const;

const BOTTOM_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calculator", label: "Calc", icon: Calculator },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fixed sidebar for desktop (md+). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          E
        </div>
        <span className="text-lg font-semibold tracking-tight">Everyday</span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-150",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: settings + theme */}
      <div className="border-t border-border px-3 py-3 space-y-1 shrink-0">
        <Link
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
            "transition-colors duration-150",
            isActive(pathname, "/settings")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
          Settings
        </Link>
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

/** Fixed bottom navigation for mobile (< md). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm"
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-16">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                "transition-colors duration-150 min-w-0",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
