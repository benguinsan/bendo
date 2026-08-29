import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ViewTaskView } from "@/components/my-task/view-task-view";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserTask } from "@/lib/tasks/load-tasks";

type ViewTaskPageProps = {
  params: Promise<{ taskId: string }>;
};

export async function generateMetadata({
  params,
}: ViewTaskPageProps): Promise<Metadata> {
  const user = await requireUser();
  const { taskId } = await params;
  const task = await loadUserTask(user.id, taskId);

  return {
    title: task ? `${task.title} · bendo` : "Task · bendo",
  };
}

export default async function ViewTaskPage({ params }: ViewTaskPageProps) {
  const user = await requireUser();
  const { taskId } = await params;
  const now = new Date();
  const task = await loadUserTask(user.id, taskId);

  if (!task) {
    notFound();
  }

  return <ViewTaskView initialTask={task} nowIso={now.toISOString()} />;
}
