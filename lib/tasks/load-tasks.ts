import "server-only";
import type { DashboardTask } from "@/lib/dashboard/task-types";
import { persistedTaskToDashboard } from "@/lib/tasks/persisted-task";
import { getTask, listTasks } from "@/lib/tasks/task-service";

export async function loadUserTasks(userId: string): Promise<DashboardTask[]> {
  const result = await listTasks(userId);

  if (!result.ok) {
    return [];
  }

  return result.data.map((task) => persistedTaskToDashboard(task));
}

export async function loadUserTask(
  userId: string,
  taskId: string
): Promise<DashboardTask | null> {
  const result = await getTask(userId, taskId);

  if (!result.ok) {
    return null;
  }

  return persistedTaskToDashboard(result.data);
}
