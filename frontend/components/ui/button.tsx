import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";

type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-transparent hover:bg-muted text-foreground",
  ghost: "bg-transparent hover:bg-muted text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-success text-success-foreground hover:bg-success/90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
