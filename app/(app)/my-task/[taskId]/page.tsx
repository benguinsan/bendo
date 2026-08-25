import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ViewTaskView } from "@/components/my-task/view-task-view";
import { getTaskById } from "@/lib/dashboard/mock-data";

type ViewTaskPageProps = {
  params: Promise<{ taskId: string }>;
};

export async function generateMetadata({
  params,
}: ViewTaskPageProps): Promise<Metadata> {
  const { taskId } = await params;
  const task = getTaskById(taskId, new Date());

  return {
    title: task ? `${task.title} · bendo` : "Task · bendo",
  };
}

export default async function ViewTaskPage({ params }: ViewTaskPageProps) {
  const { taskId } = await params;
  const now = new Date();
  const task = getTaskById(taskId, now);

  if (!task) {
    notFound();
  }

  return <ViewTaskView initialTask={task} nowIso={now.toISOString()} />;
}
