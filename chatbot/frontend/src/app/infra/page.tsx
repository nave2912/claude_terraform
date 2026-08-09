import type { Metadata } from "next";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { ResourcePanel } from "@/features/infra-request/components/ResourcePanel";

export const metadata: Metadata = {
  title: "Infrastructure Management — Landing Zone Console",
};

export default function InfraManagementPage() {
  return (
    <div className="flex h-dvh">
      <ResourcePanel />
      <div className="min-w-0 flex-1">
        <ChatWindow />
      </div>
    </div>
  );
}
