import type { Metadata } from "next";

import { PageFrame } from "@/components/app-shell/page-frame";
import { PanelTitle } from "@/components/app-shell/panel-title";
import { MyTaskView } from "@/components/my-task/my-task-view";
import { buildTaskCategoryTextSlots } from "@/components/tasks/build-task-category-text-slots";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default async function MyTaskPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = await loadUserTasks(user.id);

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
