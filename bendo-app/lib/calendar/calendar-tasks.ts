import type { DashboardTask, TaskPriority } from "@/lib/dashboard/task-types";
import { toLocalDateKey } from "@/lib/tasks/task-input";

export const CALENDAR_MAX_VISIBLE_PILLS = 3;

export const calendarPriorityPillClass: Record<TaskPriority, string> = {
  low: "bg-sky-100 text-sky-950",
  moderate: "bg-orange-100 text-orange-950",
  extreme: "bg-pink-100 text-pink-950",
};

export function getCalendarTasks(tasks: DashboardTask[]): DashboardTask[] {
  return tasks.filter((task) => task.status !== "completed");
}

export function groupTasksByDateKey(
  tasks: DashboardTask[]
): Map<string, DashboardTask[]> {
  const grouped = new Map<string, DashboardTask[]>();

  for (const task of getCalendarTasks(tasks)) {
    const dateKey = toLocalDateKey(new Date(task.scheduledAt));
    const existing = grouped.get(dateKey);

    if (existing) {
      existing.push(task);
    } else {
      grouped.set(dateKey, [task]);
    }
  }

  for (const [dateKey, dayTasks] of grouped) {
    grouped.set(
      dateKey,
      dayTasks.toSorted((a, b) => a.title.localeCompare(b.title))
    );
  }

  return grouped;
}

export function getTasksForDateKey(
  tasksByDate: Map<string, DashboardTask[]>,
  dateKey: string
): DashboardTask[] {
  return tasksByDate.get(dateKey) ?? [];
}
