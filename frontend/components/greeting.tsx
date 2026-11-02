"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-based greeting rendered client-side to avoid
 * prerender/hydration mismatches with `new Date()`.
 */
export function Greeting() {
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return <>{greeting}</>;
}
