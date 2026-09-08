"use client";

import { PaperclipIcon, SendHorizontalIcon, SmileIcon } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatComposerProps = {
  onSend: (body: string) => void;
  disabled?: boolean;
};

export function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const canSend = !disabled && draft.trim().length > 0;

  function submit() {
    if (disabled) {
      return;
    }
    const body = draft.trim();
    if (!body) {
      return;
    }
    onSend(body);
    setDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 items-center gap-2 pt-3"
    >
      <div className="border-border bg-card flex h-12 min-w-0 flex-1 items-center gap-1 rounded-xl border px-3">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          aria-label="Write a message"
          disabled={disabled}
          className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-9 shrink-0"
          aria-label="Attach file"
          disabled={disabled}
        >
          <PaperclipIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-9 shrink-0"
          aria-label="Insert emoji"
          disabled={disabled}
        >
          <SmileIcon />
        </Button>
      </div>
      <Button
        type="submit"
        size="icon"
        className="bg-priority-moderate text-primary-foreground hover:bg-priority-moderate/90 hover:text-primary-foreground size-11 shrink-0 rounded-xl"
        aria-label="Send message"
        disabled={!canSend}
      >
        <SendHorizontalIcon />
      </Button>
    </form>
  );
}
