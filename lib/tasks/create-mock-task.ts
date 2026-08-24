import type { DashboardTask, TaskPriority } from "@/lib/dashboard/mock-data";
import {
  PLACEHOLDER_THUMBNAIL_SRC,
  parseLocalDateInput,
  toLocalDateKey,
} from "@/lib/tasks/task-input";

export function scheduledAtFromDateInput(dateStr: string, now: Date): string {
  const date = parseLocalDateInput(dateStr);
  const noon = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0
  );
  const isToday = toLocalDateKey(date) === toLocalDateKey(now);

  if (isToday && noon <= now) {
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    if (toLocalDateKey(later) === toLocalDateKey(now)) {
      return later.toISOString();
    }

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();
  }

  return noon.toISOString();
}

export function createMockTask(input: {
  title: string;
  description: string;
  date: string;
  priority: TaskPriority;
  thumbnailSrc: string | null;
  now: Date;
}): DashboardTask {
  const hasUpload = Boolean(input.thumbnailSrc);

  return {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    status: "not_started",
    priority: input.priority,
    createdAt: input.now.toISOString(),
    scheduledAt: scheduledAtFromDateInput(input.date, input.now),
    completedAt: null,
    thumbnailSrc: input.thumbnailSrc ?? PLACEHOLDER_THUMBNAIL_SRC,
    thumbnailAlt: hasUpload
      ? "Uploaded task image"
      : `${input.title} thumbnail`,
  };
}
