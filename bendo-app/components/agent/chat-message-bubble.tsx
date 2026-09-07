import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DORO_AVATAR_SRC, formatChatTime } from "@/lib/agent/mock-messages";
import type { ChatMessage } from "@/lib/agent/types";
import type { DashboardProfile } from "@/lib/dashboard/task-types";
import { cn } from "@/lib/utils";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  profile: DashboardProfile;
};

export function ChatMessageBubble({
  message,
  profile,
}: ChatMessageBubbleProps) {
  const isAgent = message.role === "agent";
  const timeLabel = formatChatTime(message.createdAt);

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isAgent ? "flex-row" : "flex-row-reverse"
      )}
    >
      <Avatar className="size-10 shrink-0">
        {isAgent ? (
          <>
            <AvatarImage src={DORO_AVATAR_SRC} alt="" />
            <AvatarFallback>D</AvatarFallback>
          </>
        ) : (
          <>
            {profile.avatarSrc ? (
              <AvatarImage src={profile.avatarSrc} alt="" />
            ) : null}
            <AvatarFallback>{profile.initials}</AvatarFallback>
          </>
        )}
      </Avatar>
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1.5",
          isAgent ? "items-start" : "items-end"
        )}
      >
        <div
          className={cn(
            "text-body rounded-xl px-3.5 py-3 text-sm leading-normal",
            isAgent
              ? "border-priority-moderate bg-card border"
              : "bg-date-accent/15"
          )}
        >
          {message.body}
        </div>
        <p className="text-muted-foreground text-xs">{timeLabel}</p>
      </div>
    </div>
  );
}
