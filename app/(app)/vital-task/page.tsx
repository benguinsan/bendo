import type { Metadata } from "next";

import { VitalTaskView } from "@/components/vital-task/vital-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { filterVitalTasks } from "@/lib/dashboard/task-types";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Vital Task · bendo",
};

export default async function VitalTaskPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = filterVitalTasks(await loadUserTasks(user.id));

  return <VitalTaskView initialTasks={tasks} nowIso={now.toISOString()} />;
}
