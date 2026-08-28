import type {
  DashboardTask,
  TaskPriority,
  TaskStatus,
} from "@/lib/dashboard/task-types";
import { PLACEHOLDER_THUMBNAIL_SRC } from "@/lib/tasks/task-input";

export type PersistedTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  categoryName: string | null;
  scheduledAt: string;
  scheduledDate: string;
  completedAt: string | null;
  thumbnailSrc: string | null;
  thumbnailAlt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

export function persistedTaskToDashboard(task: PersistedTask): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    categoryId: task.categoryId,
    categoryName: task.categoryName,
    createdAt: task.createdAt,
    scheduledAt: task.scheduledAt,
    completedAt: task.completedAt,
    thumbnailSrc: task.thumbnailSrc ?? PLACEHOLDER_THUMBNAIL_SRC,
    thumbnailAlt: task.thumbnailAlt ?? `${task.title} thumbnail`,
  };
}
