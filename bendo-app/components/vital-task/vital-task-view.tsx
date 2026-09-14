"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { TaskCard } from "@/components/dashboard/task-card";
import {
  LazyConfirmDeleteTaskDialog,
  LazyEditTaskDialog,
} from "@/components/tasks/lazy-dialogs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { VitalTaskDetailPanel } from "@/components/vital-task/vital-task-detail-panel";
import { toTaskView, type DashboardTask } from "@/lib/dashboard/task-types";
import { useNow } from "@/lib/dashboard/use-now";
import { deleteTaskViaApi } from "@/lib/tasks/task-api-client";

type VitalTaskViewProps = {
  listHeading: ReactNode;
  categoryTextByTaskId: Record<string, ReactNode>;
  initialTasks: DashboardTask[];
  nowIso: string;
};

export function VitalTaskView({
  listHeading,
  categoryTextByTaskId,
  initialTasks,
  nowIso,
}: VitalTaskViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [tasksBaseline, setTasksBaseline] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(
    null
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (initialTasks !== tasksBaseline) {
    setTasksBaseline(initialTasks);
    setTasks(initialTasks);
  }

  const now = useNow(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const selectedTask = views.find((task) => task.id === selectedId) ?? null;
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const pendingDeleteTask =
    tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;

  function refreshCategoryTextSlots() {
    router.refresh();
  }

  async function handleDeleteTask(taskId: string) {
    if (deletingTaskId !== null) {
      return;
    }

    setDeletingTaskId(taskId);
    setDeleteError(null);

    try {
      const result = await deleteTaskViaApi(taskId);

      if (!result.ok) {
        setDeleteError(result.error);
        setDeletingTaskId(null);
        setPendingDeleteTaskId(null);
        return;
      }

      setTasks((current) => current.filter((task) => task.id !== taskId));
      setSelectedId((currentSelected) =>
        currentSelected === taskId
          ? (tasks.find((task) => task.id !== taskId)?.id ?? null)
          : currentSelected
      );
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
      setPendingDeleteTaskId(null);
      refreshCategoryTextSlots();
    } catch {
      setDeleteError("Could not delete task.");
      setPendingDeleteTaskId(null);
    }

    setDeletingTaskId(null);
  }

  return (
    <>
      {deleteError ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          {deleteError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,423fr)_minmax(0,511fr)] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
          <CardHeader>{listHeading}</CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {views.length > 0 ? (
              <div className="flex flex-col gap-3">
                {views.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    categoryText={categoryTextByTaskId[task.id]}
                    selected={task.id === selectedId}
                    href={`/my-task/${task.id}`}
                    onSelect={() => setSelectedId(task.id)}
                    onEdit={() => setEditingTaskId(task.id)}
                    onDelete={() => setPendingDeleteTaskId(task.id)}
                    deleting={deletingTaskId === task.id}
                  />
                ))}
              </div>
            ) : (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CircleAlertIcon />
                  </EmptyMedia>
                  <EmptyTitle>No vital tasks yet</EmptyTitle>
                  <EmptyDescription>
                    Tasks you mark as vital will show up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
        <VitalTaskDetailPanel
          task={selectedTask}
          onEdit={selectedId ? () => setEditingTaskId(selectedId) : undefined}
          onDelete={
            selectedId ? () => setPendingDeleteTaskId(selectedId) : undefined
          }
          deleting={selectedId !== null && deletingTaskId === selectedId}
        />
      </div>
      {editingTask ? (
        <LazyEditTaskDialog
          task={editingTask}
          open
          existingTasks={tasks}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingTaskId(null);
            }
          }}
          onUpdate={(updated) => {
            setTasks((current) =>
              current.map((task) => (task.id === updated.id ? updated : task))
            );
            refreshCategoryTextSlots();
          }}
        />
      ) : null}
      {pendingDeleteTaskId ? (
        <LazyConfirmDeleteTaskDialog
          open
          taskTitle={pendingDeleteTask?.title}
          isDeleting={deletingTaskId === pendingDeleteTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteTaskId(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteTask(pendingDeleteTaskId);
          }}
        />
      ) : null}
    </>
  );
}
