import "server-only";
import {
  cloudGetTask,
  cloudListTasks,
  isCloudSupabaseMode,
} from "@/lib/api/cloud";
import type { DashboardTask } from "@/lib/dashboard/task-types";
import { persistedTaskToDashboard } from "@/lib/tasks/persisted-task";
import { getTask, listTasks } from "@/lib/tasks/task-service";

export async function loadUserTasks(userId: string): Promise<DashboardTask[]> {
  if (isCloudSupabaseMode()) {
    void userId;
    const tasks = await cloudListTasks();
    return tasks.map((task) => persistedTaskToDashboard(task));
  }

  const result = await listTasks(userId);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.data.map((task) => persistedTaskToDashboard(task));
}

export async function loadUserTask(
  userId: string,
  taskId: string
): Promise<DashboardTask | null> {
  if (isCloudSupabaseMode()) {
    void userId;
    const task = await cloudGetTask(taskId);
    return task ? persistedTaskToDashboard(task) : null;
  }

  const result = await getTask(userId, taskId);

  if (!result.ok) {
    if (result.code === "TASK_NOT_FOUND") {
      return null;
    }

    throw new Error(result.message);
  }

  return persistedTaskToDashboard(result.data);
}
