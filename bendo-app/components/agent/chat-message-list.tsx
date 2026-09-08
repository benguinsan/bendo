"use client";

import { useEffect, useRef } from "react";

import { ChatMessageBubble } from "@/components/agent/chat-message-bubble";
import { Separator } from "@/components/ui/separator";
import { groupMessagesByDate } from "@/lib/agent/mock-messages";
import type { ChatMessage } from "@/lib/agent/types";
import type { DashboardProfile } from "@/lib/dashboard/task-types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  profile: DashboardProfile;
};

export function ChatMessageList({ messages, profile }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const groups = groupMessagesByDate(messages);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-1 py-4"
      role="log"
      aria-label="Conversation with Doro"
      aria-live="polite"
    >
      {groups.map((group) => (
        <section key={group.dateKey} className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <p className="text-muted-foreground shrink-0 text-xs">
              {group.label}
            </p>
            <Separator className="flex-1" />
          </div>
          <div className="flex flex-col gap-5">
            {group.messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                profile={profile}
              />
            ))}
          </div>
        </section>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
