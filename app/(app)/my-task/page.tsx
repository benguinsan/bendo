import type { Metadata } from "next";

import { MyTaskView } from "@/components/my-task/my-task-view";
import { getMyTasks, toTaskView } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default function MyTaskPage() {
  const now = new Date();
  const tasks = getMyTasks(now).map((task) => toTaskView(task, now));

  return <MyTaskView tasks={tasks} />;
}
