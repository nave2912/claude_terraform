import type { FieldErrors } from "react-hook-form";

/** RHF's error object mirrors the form's real nested shape (objects and
 * array indices alike), so a dot-path like "tags.owner" or
 * "dataDisks.0.name" walks it directly — no special-casing needed for
 * how deep or how array-y the path is. */
export function getFieldError(errors: FieldErrors, path: string): string | undefined {
  const segments = path.split(".");
  let cur: unknown = errors;
  for (const segment of segments) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[segment];
  }
  if (cur && typeof cur === "object" && "message" in cur) {
    return (cur as { message?: string }).message;
  }
  return undefined;
}
