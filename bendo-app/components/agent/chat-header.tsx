"use client";

import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";

import { ModelApiKeyDialog } from "@/components/agent/model-api-key-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DORO_AVATAR_SRC,
  DORO_DISPLAY_NAME,
  DORO_SUBTITLE,
} from "@/lib/agent/chat";

export function ChatHeader() {
  const [apiKeyOpen, setApiKeyOpen] = useState(false);

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
          onClick={() => setApiKeyOpen(true)}
        >
          <KeyRoundIcon />
        </Button>
      </div>
      <ModelApiKeyDialog open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
    </header>
  );
}
