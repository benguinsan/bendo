import type { Metadata } from "next";

import { MyTaskView } from "@/components/my-task/my-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default async function MyTaskPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = await loadUserTasks(user.id);

  return <MyTaskView initialTasks={tasks} nowIso={now.toISOString()} />;
}
