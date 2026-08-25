import type { Metadata } from "next";

import { MyTaskView } from "@/components/my-task/my-task-view";
import { getMyTasks } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default function MyTaskPage() {
  const now = new Date();

  return (
    <MyTaskView initialTasks={getMyTasks(now)} nowIso={now.toISOString()} />
  );
}
