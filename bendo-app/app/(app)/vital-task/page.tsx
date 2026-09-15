import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PanelTitle } from "@/components/app-shell/panel-title";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { VitalTaskView } from "@/components/vital-task/vital-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { filterVitalTasks } from "@/lib/dashboard/task-types";
import {
  filterTasksByQuery,
  normalizeTaskSearchQuery,
} from "@/lib/tasks/filter-tasks-by-query";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Vital Task · bendo",
};

type VitalTaskPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function VitalTaskPage({
  searchParams,
}: VitalTaskPageProps) {
  const user = await requireUser();
  const now = new Date();
  const { q } = await searchParams;
  const query = normalizeTaskSearchQuery(q);
  const tasks = filterTasksByQuery(
    filterVitalTasks(await loadUserTasks(user.id)),
    query
  );

  return (
    <PageFrame variant="fill">
      <VitalTaskView
        listHeading={<PanelTitle accent="Vital" rest="Tasks" />}
        categoryTextByTaskId={buildTaskCategoryTextSlots(tasks)}
        initialTasks={tasks}
        nowIso={now.toISOString()}
      />
    </PageFrame>
  );
}
