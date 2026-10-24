"use client";

import { KeyRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DORO_AVATAR_SRC,
  DORO_DISPLAY_NAME,
  DORO_SUBTITLE,
} from "@/lib/agent/chat";
import { readinessBlockReason } from "@/lib/agent/chat-user-errors";
import { cn } from "@/lib/utils";

type ChatHeaderProps = {
  bridgeConfigured: boolean;
  bridgeReachable: boolean | null;
  modelConfigured: boolean;
  checking?: boolean;
  onOpenModelConfig: () => void;
};

function readinessLabel(input: {
  checking: boolean;
  bridgeConfigured: boolean;
  bridgeReachable: boolean | null;
  modelConfigured: boolean;
}): { text: string; tone: "ready" | "warn" | "muted" } {
  if (input.checking) {
    return { text: "Checking…", tone: "muted" };
  }
  const block = readinessBlockReason(input);
  if (!block) {
    return { text: "Ready to chat", tone: "ready" };
  }
  if (!input.modelConfigured) {
    return { text: "Needs model config", tone: "warn" };
  }
  return { text: "Agent offline", tone: "warn" };
}

export function ChatHeader({
  bridgeConfigured,
  bridgeReachable,
  modelConfigured,
  checking = false,
  onOpenModelConfig,
}: ChatHeaderProps) {
  const label = readinessLabel({
    checking,
    bridgeConfigured,
    bridgeReachable,
    modelConfigured,
  });

  return (
    <header className="border-border/60 flex shrink-0 items-center justify-between gap-3 border-b px-1 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-11">
          <AvatarImage src={DORO_AVATAR_SRC} alt="" />
          <AvatarFallback>D</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-foreground truncate text-base font-semibold">
            {DORO_DISPLAY_NAME}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {DORO_SUBTITLE}
            <span
              className={cn(
                "ml-2 inline-block",
                label.tone === "ready" && "text-priority-moderate",
                label.tone === "warn" && "text-destructive",
                label.tone === "muted" && "text-muted-foreground"
              )}
            >
              · {label.text}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-10"
          aria-label="Model configuration"
          onClick={onOpenModelConfig}
        >
          <KeyRoundIcon />
        </Button>
      </div>
    </header>
  );
}
