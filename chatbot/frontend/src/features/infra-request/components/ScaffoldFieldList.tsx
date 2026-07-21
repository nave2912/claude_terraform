import type { ScaffoldFieldSummary } from "@/types/schema";

/** Shared by ScaffoldPlanMessage — renders one labeled group (mandatory or
 * optional) of fields from a module-scaffold plan. */
export function ScaffoldFieldList({ fields, label }: { fields: ScaffoldFieldSummary[]; label: string }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {fields.map((f) => (
          <li key={f.name} className="text-xs break-words">
            <span className="font-mono font-medium">{f.name}</span>{" "}
            <span className="break-all text-muted-foreground">({f.hclType})</span>
            {f.description && <p className="text-muted-foreground">{f.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
