import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { ResourcePanel } from "@/features/infra-request/components/ResourcePanel";

export default function Home() {
  return (
    <div className="flex h-dvh">
      <ResourcePanel />
      <div className="min-w-0 flex-1">
        <ChatWindow />
      </div>
    </div>
  );
}
