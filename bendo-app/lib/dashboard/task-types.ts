import { formatRelativeCompleted } from "@/lib/dashboard/dates";

/** Persisted in Supabase and sent over the API. */
export type TaskStatus = "pending" | "completed";

/** Shown in the UI; `expired` is derived from schedule time, not stored. */
export type TaskDisplayStatus = TaskStatus | "expired";

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
  displayStatus: TaskDisplayStatus;
};

export type StatusPercents = {
  completed: number;
  pending: number;
  expired: number;
};

export function isTaskOverdue(task: DashboardTask, now: Date): boolean {
  return task.status !== "completed" && new Date(task.scheduledAt) < now;
}

export function getTaskDisplayStatus(
  task: Pick<DashboardTask, "status" | "scheduledAt">,
  now: Date
): TaskDisplayStatus {
  if (task.status === "completed") {
    return "completed";
  }

  return new Date(task.scheduledAt) < now ? "expired" : "pending";
}

export function toTaskView(task: DashboardTask, now: Date): DashboardTaskView {
  const isOverdue = isTaskOverdue(task, now);

  return {
    ...task,
    isOverdue,
    displayStatus: getTaskDisplayStatus(task, now),
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

export function getTaskStatusPercents(
  tasks: DashboardTask[],
  now: Date
): StatusPercents {
  const total = tasks.length;

  if (total === 0) {
    return { completed: 0, pending: 0, expired: 0 };
  }

  let completed = 0;
  let pending = 0;
  let expired = 0;

  for (const task of tasks) {
    const displayStatus = getTaskDisplayStatus(task, now);

    if (displayStatus === "completed") {
      completed += 1;
    } else if (displayStatus === "expired") {
      expired += 1;
    } else {
      pending += 1;
    }
  }

  return {
    completed: Math.round((100 * completed) / total),
    pending: Math.round((100 * pending) / total),
    expired: Math.round((100 * expired) / total),
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

export const statusLabels: Record<TaskDisplayStatus, string> = {
  pending: "Pending",
  expired: "Expired",
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

export const statusTextClass: Record<TaskDisplayStatus, string> = {
  pending: "text-status-pending",
  expired: "text-status-expired",
  completed: "text-status-completed",
};

export const statusFillClass: Record<TaskDisplayStatus, string> = {
  pending: "bg-status-pending",
  expired: "bg-status-expired",
  completed: "bg-status-completed",
};

export function filterVitalTasks(tasks: DashboardTask[]): DashboardTask[] {
  return tasks.filter((task) => task.priority === "extreme");
}
