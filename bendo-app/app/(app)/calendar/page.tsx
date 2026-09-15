import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { CalendarView } from "@/components/calendar/calendar-view";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { requireUser } from "@/lib/auth/require-user";
import {
  filterTasksByQuery,
  normalizeTaskSearchQuery,
} from "@/lib/tasks/filter-tasks-by-query";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Calendar · bendo",
};

type CalendarPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const user = await requireUser();
  const now = new Date();
  const { q } = await searchParams;
  const query = normalizeTaskSearchQuery(q);
  const tasks = filterTasksByQuery(await loadUserTasks(user.id), query);

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
