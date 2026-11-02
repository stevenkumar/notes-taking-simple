"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/context/theme-context";
import { Moon, Sun, Info } from "lucide-react";

export default function SettingsPage() {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences for Everyday"
        actions={<Badge variant="secondary">Local</Badge>}
      />

      <div className="grid gap-4 max-w-2xl">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle between light and dark themes
              </p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" aria-hidden="true" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Everyday</span> —
              all-in-one productivity platform.
            </p>
            <p>Version 0.1.0 (Foundation)</p>
            <p>
              Data is stored locally in your browser. Cloud sync and accounts
              arrive in a later phase.
            </p>
          </CardContent>
        </Card>

        {/* Future settings placeholder */}
        <Card className="opacity-70">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Default currency", value: "INR (₹)" },
              { label: "Locale", value: "English (India)" },
              { label: "Number format", value: "Indian grouping" },
            ].map((pref) => (
              <div
                key={pref.label}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <span className="text-sm">{pref.label}</span>
                <span className="text-sm text-muted-foreground">{pref.value}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              These preferences become editable when user profiles arrive.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
