export type ChatRole = "agent" | "user";

export type ChatMessageKind = "text";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  kind: ChatMessageKind;
  createdAt: string;
  body: string;
};

export type ChatDateGroup = {
  dateKey: string;
  label: string;
  messages: ChatMessage[];
};

/** Max UTF-16 code units accepted for one user chat turn. */
export const AGENT_CHAT_MESSAGE_MAX = 4000;

export type SendChatTurnInput = {
  userId: string;
  message: string;
  sessionId?: string;
  /** Clerk session JWT forwarded to Doro tools (server-only). */
  clerkToken: string;
  /** Client-generated id; same value on retry dedupes an aborted POST. */
  clientRequestId?: string;
  /** Aborts the bridge fetch when the HTTP client disconnects. */
  signal?: AbortSignal;
};

export type SendChatTurnResult = {
  sessionId: string;
  reply: ChatMessage;
};
