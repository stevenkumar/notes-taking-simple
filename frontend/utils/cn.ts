/** Merge class names, filtering out falsy values. */
export function cn(
  ...classes: Array<string | number | bigint | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
