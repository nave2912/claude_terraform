import type {
  PreviewOutcome,
  ProposeOutcome,
  ResourceTypeInfo,
  ScaffoldGenerateOutcome,
  ScaffoldPlanOutcome,
  StructuredProposalInput,
} from "@/types/schema";

type ScaffoldPlanReady = Extract<ScaffoldPlanOutcome, { status: "plan_ready" }>;

export type ChatRole = "user" | "bot";

export type ChatMessage =
  | { id: string; role: ChatRole; kind: "text"; text: string }
  | { id: string; role: "bot"; kind: "clarification"; question: string }
  | {
      id: string;
      role: "bot";
      kind: "resource-form";
      resourceType: ResourceTypeInfo;
      environment?: string;
      /** "Modify existing" mode: see DynamicResourceForm's editingKey/initialValues. */
      editingKey?: string;
      initialValues?: Record<string, unknown>;
    }
  | { id: string; role: "bot"; kind: "preview"; outcome: PreviewOutcome; input: StructuredProposalInput }
  | { id: string; role: "bot"; kind: "result"; outcome: ProposeOutcome }
  | { id: string; role: "bot"; kind: "error"; message: string }
  | { id: string; role: "bot"; kind: "scaffold-plan"; plan: ScaffoldPlanReady }
  | { id: string; role: "bot"; kind: "scaffold-result"; outcome: ScaffoldGenerateOutcome }
  | { id: string; role: "bot"; kind: "keyvault-panel" };

/** Distributive Omit — plain `Omit<ChatMessage, "id">` collapses the union
 * into the intersection of common keys, losing each variant's own fields.
 * This preserves per-variant shape so addMessage() stays fully typed. */
export type ChatMessageInput = ChatMessage extends infer M
  ? M extends { id: string }
    ? Omit<M, "id">
    : never
  : never;
