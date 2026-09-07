import { PlayIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DORO_AVATAR_SRC, formatChatTime } from "@/lib/agent/mock-messages";
import type { ChatMessage } from "@/lib/agent/types";

const WAVEFORM_HEIGHTS = [
  8, 14, 10, 18, 12, 22, 16, 20, 9, 24, 14, 19, 11, 17, 13, 21, 10, 16, 12, 18,
  8, 15, 11, 20, 9, 14, 10, 16,
];

type ChatAudioBubbleProps = {
  message: ChatMessage;
};

export function ChatAudioBubble({ message }: ChatAudioBubbleProps) {
  const progress = message.progress ?? 0.4;
  const filledCount = Math.round(WAVEFORM_HEIGHTS.length * progress);
  const timeLabel = formatChatTime(message.createdAt);

  return (
    <div className="flex w-full flex-row gap-3">
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={DORO_AVATAR_SRC} alt="" />
        <AvatarFallback>D</AvatarFallback>
      </Avatar>
      <div className="flex max-w-[75%] flex-col items-start gap-1.5">
        <div className="border-priority-moderate bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5">
          <div className="flex flex-col items-center gap-1">
            <Button
              type="button"
              size="icon"
              className="bg-priority-moderate text-primary-foreground hover:bg-priority-moderate/90 hover:text-primary-foreground size-10 rounded-full"
              aria-label="Play voice message"
            >
              <PlayIcon className="fill-current" />
            </Button>
            <span className="text-muted-foreground text-[10px]">
              {message.durationLabel ?? "0:00"}
            </span>
          </div>
          <div className="flex h-8 items-end gap-0.5" aria-hidden="true">
            {WAVEFORM_HEIGHTS.map((height, index) => (
              <span
                key={`wave-${height}-${index}`}
                className={
                  index < filledCount
                    ? "bg-priority-moderate/70 w-0.5 rounded-full"
                    : "bg-muted-foreground/35 w-0.5 rounded-full"
                }
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{timeLabel}</p>
      </div>
    </div>
  );
}
