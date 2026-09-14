import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { CalendarView } from "@/components/calendar/calendar-view";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Calendar · bendo",
};

export default async function CalendarPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = await loadUserTasks(user.id);

  return (
    <PageFrame>
      <CalendarView
        categoryTextByTaskId={buildTaskCategoryTextSlots(tasks)}
        initialTasks={tasks}
        nowIso={now.toISOString()}
      />
    </PageFrame>
  );
}
