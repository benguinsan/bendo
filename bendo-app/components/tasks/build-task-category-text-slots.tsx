import type { ReactNode } from "react";

import { TaskCategoryText } from "@/components/tasks/task-category-text";
import type { DashboardTask } from "@/lib/dashboard/task-types";

type BuildTaskCategoryTextSlotsOptions = {
  className?: string;
};

/** Build per-task SSR category text slots. Call only from Server Components. */
export function buildTaskCategoryTextSlots(
  tasks: readonly DashboardTask[],
  options: BuildTaskCategoryTextSlotsOptions = {}
): Record<string, ReactNode> {
  const slots: Record<string, ReactNode> = {};

  for (const task of tasks) {
    if (!task.categoryName) {
      continue;
    }

    slots[task.id] = (
      <TaskCategoryText
        name={task.categoryName}
        className={options.className}
      />
    );
  }

  return slots;
}
