import type { DashboardTask } from "@/lib/dashboard/task-types";
import { parseLocalDateInput, toLocalDateKey } from "@/lib/tasks/task-input";

const dateLocale = "en-GB";

export type NotificationTaskGroup = {
  dateKey: string;
  label: string;
  tasks: DashboardTask[];
};

export function getNotificationTasks(tasks: DashboardTask[]): DashboardTask[] {
  return tasks
    .filter((task) => task.status !== "completed")
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function formatCompactRelativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const diffMs = Math.max(0, now.getTime() - then.getTime());
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatNotificationGroupLabel(
  dateKey: string,
  todayKey: string
): string {
  if (dateKey === todayKey) {
    return "Today";
  }

  const yesterday = parseLocalDateInput(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === toLocalDateKey(yesterday)) {
    return "Yesterday";
  }

  const date = parseLocalDateInput(dateKey);
  return new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function groupNotificationTasks(
  tasks: DashboardTask[],
  now: Date
): NotificationTaskGroup[] {
  const openTasks = getNotificationTasks(tasks);
  const todayKey = toLocalDateKey(now);
  const map = new Map<string, DashboardTask[]>();

  for (const task of openTasks) {
    const dateKey = toLocalDateKey(new Date(task.scheduledAt));
    const existing = map.get(dateKey);

    if (existing) {
      existing.push(task);
    } else {
      map.set(dateKey, [task]);
    }
  }

  return [...map.entries()]
    .toSorted(([a], [b]) => {
      if (a < b) {
        return 1;
      }

      if (a > b) {
        return -1;
      }

      return 0;
    })
    .map(([dateKey, groupTasks]) => ({
      dateKey,
      label: formatNotificationGroupLabel(dateKey, todayKey),
      tasks: groupTasks,
    }));
}
