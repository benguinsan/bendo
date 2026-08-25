import type { Metadata } from "next";

import { VitalTaskView } from "@/components/vital-task/vital-task-view";
import { getVitalTasks } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "Vital Task · bendo",
};

export default function VitalTaskPage() {
  const now = new Date();

  return (
    <VitalTaskView
      initialTasks={getVitalTasks(now)}
      nowIso={now.toISOString()}
    />
  );
}
