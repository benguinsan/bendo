import { formatRelativeCompleted } from "@/lib/dashboard/dates";

export type TaskStatus = "not_started" | "in_progress" | "completed";
export type TaskPriority = "low" | "moderate" | "extreme";

export type DashboardProfile = {
  firstName: string;
  fullName: string;
  email: string;
  avatarSrc: string;
  initials: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  contentTitle?: string;
  objective?: string;
  additionalNotes?: string[];
  deadlineLabel?: string;
  checklist?: string[];
  optionalItems?: string[];
  detailDescription?: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  scheduledAt: string;
  completedAt: string | null;
  thumbnailSrc: string;
  thumbnailAlt: string;
};

export type DashboardTaskView = DashboardTask & {
  isOverdue: boolean;
};

export type StatusPercents = {
  completed: number;
  inProgress: number;
  notStarted: number;
};

export function isTaskOverdue(task: DashboardTask, now: Date): boolean {
  return task.status !== "completed" && new Date(task.scheduledAt) < now;
}

export function toTaskView(task: DashboardTask, now: Date): DashboardTaskView {
  return {
    ...task,
    isOverdue: isTaskOverdue(task, now),
  };
}

export function getOpenTasks(tasks: DashboardTaskView[]): DashboardTaskView[] {
  return tasks.filter((task) => task.status !== "completed");
}

export function getCompletedTasks(
  tasks: DashboardTaskView[]
): DashboardTaskView[] {
  return tasks.filter((task) => task.status === "completed");
}

export function getTaskStatusPercents(tasks: DashboardTask[]): StatusPercents {
  const total = tasks.length;

  if (total === 0) {
    return { completed: 0, inProgress: 0, notStarted: 0 };
  }

  const count = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status).length;

  return {
    completed: Math.round((100 * count("completed")) / total),
    inProgress: Math.round((100 * count("in_progress")) / total),
    notStarted: Math.round((100 * count("not_started")) / total),
  };
}

export function getCompletedLabel(
  task: DashboardTask,
  now: Date
): string | null {
  if (!task.completedAt) {
    return null;
  }

  return formatRelativeCompleted(task.completedAt, now);
}

export const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  moderate: "Moderate",
  extreme: "Extreme",
};

export const priorityTextClass: Record<TaskPriority, string> = {
  low: "text-priority-low",
  moderate: "text-priority-moderate",
  extreme: "text-priority-extreme",
};

export const statusTextClass: Record<TaskStatus, string> = {
  not_started: "text-status-not-started",
  in_progress: "text-status-in-progress",
  completed: "text-status-completed",
};

export const statusFillClass: Record<TaskStatus, string> = {
  not_started: "bg-status-not-started",
  in_progress: "bg-status-in-progress",
  completed: "bg-status-completed",
};

export function filterVitalTasks(tasks: DashboardTask[]): DashboardTask[] {
  return tasks.filter((task) => task.priority === "extreme");
}
