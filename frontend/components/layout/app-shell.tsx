import { Suspense, type ReactNode } from "react";
import { Sidebar, BottomNav } from "./navigation";

/**
 * Application shell: fixed sidebar on desktop, bottom nav on mobile,
 * scrollable main content area with mobile-safe padding.
 *
 * Navigation is wrapped in Suspense because `usePathname()` cannot be
 * resolved during prerendering of dynamic routes (Next.js cacheComponents).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Suspense fallback={null}>
        <Sidebar />
        <BottomNav />
      </Suspense>

      {/* Main content — offset by sidebar width on desktop, bottom nav on mobile */}
      <main className="md:pl-60 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
