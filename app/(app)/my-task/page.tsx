import type { Metadata } from "next";

import { MyTaskView } from "@/components/my-task/my-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { getMyTasks } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default async function MyTaskPage() {
  await requireUser();
  const now = new Date();

  return (
    <MyTaskView initialTasks={getMyTasks(now)} nowIso={now.toISOString()} />
  );
}
