import type { ChatDateGroup, ChatMessage } from "@/lib/agent/types";

export const DORO_AVATAR_SRC = "/agent/doro.jpeg";
export const DORO_DISPLAY_NAME = "Doro";
export const DORO_SUBTITLE = "Task assistant";

export function getMockAgentMessages(): ChatMessage[] {
  return [
    {
      id: "msg-1",
      role: "agent",
      kind: "text",
      createdAt: "2024-08-21T22:15:00+07:00",
      body: "Mình có thể giúp sắp xếp việc trong ngày, nhắc hạn, hoặc cập nhật trạng thái task. Cứ nhắn khi cần — mình sẽ kiểm tra và hỗ trợ từng bước cho rõ ràng.",
    },
    {
      id: "msg-2",
      role: "user",
      kind: "text",
      createdAt: "2024-08-21T12:15:00+07:00",
      body: "Ok, giúp mình xem task nào sắp đến hạn nhé.",
    },
    {
      id: "msg-3",
      role: "agent",
      kind: "audio",
      createdAt: "2024-08-21T18:00:00+07:00",
      durationLabel: "0:56",
      progress: 0.4,
    },
    {
      id: "msg-4",
      role: "agent",
      kind: "text",
      createdAt: "2024-08-22T18:00:00+07:00",
      body: "Nếu cần chỉnh ưu tiên hoặc lịch, cứ nói mình biết nhé.",
    },
  ];
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
