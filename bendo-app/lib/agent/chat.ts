import type { ChatDateGroup, ChatMessage } from "@/lib/agent/types";

export const DORO_AVATAR_SRC = "/agent/doro.jpeg";
export const DORO_DISPLAY_NAME = "Doro";
export const DORO_SUBTITLE = "Task assistant";

const DORO_WELCOME_BODY =
  "Xin chào mình là Doro, trợ lý viên hỗ trợ cho ứng dụng Bendo";

/** Local welcome bubble until chat history is persisted. */
export function createDoroWelcomeMessage(now = new Date()): ChatMessage {
  return {
    id: "msg-doro-welcome",
    role: "agent",
    kind: "text",
    createdAt: now.toISOString(),
    body: DORO_WELCOME_BODY,
  };
}

/** Fixed zone so SSR (often UTC) and the browser format the same labels. */
const chatTimeZone = "Asia/Ho_Chi_Minh";

function calendarDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: chatTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function formatChatTime(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: chatTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

  return formatted.replaceAll(" ", " ").toLowerCase();
}

export function formatChatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: chatTimeZone,
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function groupMessagesByDate(messages: ChatMessage[]): ChatDateGroup[] {
  const groups: ChatDateGroup[] = [];

  for (const message of messages) {
    const dateKey = calendarDateKey(message.createdAt);
    const last = groups.at(-1);

    if (last?.dateKey === dateKey) {
      last.messages.push(message);
      continue;
    }

    groups.push({
      dateKey,
      label: formatChatDateLabel(message.createdAt),
      messages: [message],
    });
  }

  return groups;
}

/** Local optimistic user bubble before Harness reply arrives. */
export function createUserTextMessage(
  body: string,
  now = new Date()
): ChatMessage {
  return {
    id: `msg-user-${now.getTime()}`,
    role: "user",
    kind: "text",
    createdAt: now.toISOString(),
    body,
  };
}
