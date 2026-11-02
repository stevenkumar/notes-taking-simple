import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground bg-transparent",
  success: "bg-success/15 text-success dark:text-success",
  warning: "bg-warning/15 text-warning dark:text-warning",
  destructive: "bg-destructive/15 text-destructive dark:text-destructive",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
