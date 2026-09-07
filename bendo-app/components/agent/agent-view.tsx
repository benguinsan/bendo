"use client";

import { useState } from "react";

import { ChatComposer } from "@/components/agent/chat-composer";
import { ChatHeader } from "@/components/agent/chat-header";
import { ChatMessageList } from "@/components/agent/chat-message-list";
import {
  createUserTextMessage,
  getMockAgentMessages,
} from "@/lib/agent/mock-messages";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type AgentViewProps = {
  profile: DashboardProfile;
};

export function AgentView({ profile }: AgentViewProps) {
  const [messages, setMessages] = useState(getMockAgentMessages);

  function handleSend(body: string) {
    setMessages((current) => [...current, createUserTextMessage(body)]);
  }

  return (
    <div className="flex h-[calc(100svh-100px)] min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="bg-card shadow-panel rounded-card border-border/40 flex min-h-0 flex-1 flex-col border px-4 py-4 sm:px-6 sm:py-5">
        <ChatHeader />
        <ChatMessageList messages={messages} profile={profile} />
        <ChatComposer onSend={handleSend} />
      </div>
    </div>
  );
}
