import type { Metadata } from "next";
import { ObservabilityShell } from "@/features/observability/components/ObservabilityShell";

export const metadata: Metadata = {
  title: "Observability — Landing Zone Console",
};

export default function ObservabilityPage() {
  return <ObservabilityShell />;
}
