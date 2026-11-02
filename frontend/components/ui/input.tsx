import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  /** Optional label rendered above the input. */
  label?: string;
  /** Optional helper or error text rendered below. */
  hint?: string;
  /** Render hint in destructive colour (error state). */
  error?: boolean;
  /** Prefix element (e.g. currency symbol). */
  prefix?: ReactNode;
  /** Suffix element (e.g. unit label). */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "flex items-center rounded-lg border border-input bg-background",
            "transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive",
          )}
        >
          {prefix && (
            <span className="pl-3 text-sm text-muted-foreground select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full bg-transparent px-3 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              prefix ? "pl-2" : "",
              suffix ? "pr-2" : "",
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="pr-3 text-sm text-muted-foreground select-none">
              {suffix}
            </span>
          )}
        </div>
        {hint && (
          <p
            className={cn(
              "text-xs",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
