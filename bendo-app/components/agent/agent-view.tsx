"use client";

import { useState } from "react";

import { ChatComposer } from "@/components/agent/chat-composer";
import { ChatHeader } from "@/components/agent/chat-header";
import { ChatMessageList } from "@/components/agent/chat-message-list";
import {
  createDoroWelcomeMessage,
  createUserTextMessage,
} from "@/lib/agent/chat";
import { sendChatTurnViaApi } from "@/lib/agent/chat-api-client";
import type { ChatMessage } from "@/lib/agent/types";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type AgentViewProps = {
  profile: DashboardProfile;
};

export function AgentView({ profile }: AgentViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createDoroWelcomeMessage(),
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(body: string) {
    if (pending) {
      return;
    }

    const userMessage = createUserTextMessage(body);
    setMessages((current) => [...current, userMessage]);
    setPending(true);
    setError(null);

    const result = await sendChatTurnViaApi({
      message: body,
      sessionId,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    setSessionId(result.sessionId);
    setMessages((current) => [...current, result.reply]);
    setPending(false);
  }

  return (
    <div className="flex h-[calc(100svh-100px)] min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="bg-card shadow-panel rounded-card border-border/40 flex min-h-0 flex-1 flex-col border px-4 py-4 sm:px-6 sm:py-5">
        <ChatHeader />
        <ChatMessageList messages={messages} profile={profile} />
        {pending ? (
          <p className="text-muted-foreground px-1 pt-1 text-xs">
            Doro is typing…
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive px-1 pt-1 text-xs" role="alert">
            {error}
          </p>
        ) : null}
        <ChatComposer onSend={handleSend} disabled={pending} />
      </div>
    </div>
  );
}
