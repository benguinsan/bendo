export type ChatRole = "agent" | "user";

export type ChatMessageKind = "text" | "audio";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  kind: ChatMessageKind;
  createdAt: string;
  body?: string;
  durationLabel?: string;
  /** 0–1 visual progress for audio bubbles */
  progress?: number;
};

export type ChatDateGroup = {
  dateKey: string;
  label: string;
  messages: ChatMessage[];
};
