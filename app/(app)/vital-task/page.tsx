import type { Metadata } from "next";

import { VitalTaskView } from "@/components/vital-task/vital-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { getVitalTasks } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "Vital Task · bendo",
};

export default async function VitalTaskPage() {
  await requireUser();
  const now = new Date();

  return (
    <VitalTaskView
      initialTasks={getVitalTasks(now)}
      nowIso={now.toISOString()}
    />
  );
}
