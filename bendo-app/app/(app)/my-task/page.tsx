import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PanelTitle } from "@/components/app-shell/panel-title";
import { MyTaskView } from "@/components/my-task/my-task-view";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { requireUser } from "@/lib/auth/require-user";
import {
  filterTasksByQuery,
  normalizeTaskSearchQuery,
} from "@/lib/tasks/filter-tasks-by-query";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

type MyTaskPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function MyTaskPage({ searchParams }: MyTaskPageProps) {
  const user = await requireUser();
  const now = new Date();
  const { q } = await searchParams;
  const query = normalizeTaskSearchQuery(q);
  const tasks = filterTasksByQuery(await loadUserTasks(user.id), query);

  return (
    <PageFrame variant="fill">
      <MyTaskView
        listHeading={<PanelTitle accent="My" rest="Tasks" />}
        categoryTextByTaskId={buildTaskCategoryTextSlots(tasks)}
        detailCategoryTextByTaskId={buildTaskCategoryTextSlots(tasks, {
          className: "text-sm",
        })}
        initialTasks={tasks}
        nowIso={now.toISOString()}
      />
    </PageFrame>
  );
}
