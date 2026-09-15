import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PageHeading } from "@/components/app-shell/page-heading";
import { DashboardStaticPanels } from "@/components/dashboard/dashboard-static-panels";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { TodoDateLine } from "@/components/dashboard/todo-date-line";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";
import {
  filterTasksByQuery,
  normalizeTaskSearchQuery,
} from "@/lib/tasks/filter-tasks-by-query";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Dashboard · Bendo",
};

type DashboardPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await requireUser();
  const { firstName } = toDashboardProfile(user);
  const now = new Date();
  const { q } = await searchParams;
  const query = normalizeTaskSearchQuery(q);
  const tasks = filterTasksByQuery(await loadUserTasks(user.id), query);

  return (
    <PageFrame>
      <PageHeading>Welcome back, {firstName} 👋</PageHeading>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        <div className="min-w-0">
          <DashboardView
            dateLine={<TodoDateLine date={now} />}
            categoryTextByTaskId={buildTaskCategoryTextSlots(tasks)}
            initialTasks={tasks}
            nowIso={now.toISOString()}
          />
        </div>
        <DashboardStaticPanels tasks={tasks} now={now} />
      </div>
    </PageFrame>
  );
}
