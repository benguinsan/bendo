"use client";

import { ListTodoIcon } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/dashboard/task-card";
import { TaskDetailPanel } from "@/components/my-task/task-detail-panel";
import { ConfirmDeleteTaskDialog } from "@/components/tasks/confirm-delete-task-dialog";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  toTaskView,
  type DashboardTask,
  type TaskStatus,
} from "@/lib/dashboard/task-types";
import {
  deleteTaskViaApi,
  updateTaskStatusViaApi,
} from "@/lib/tasks/task-api-client";

type MyTaskViewProps = {
  initialTasks: DashboardTask[];
  nowIso: string;
};

function detailPanelStatusHandlers(
  selectedId: string | null,
  selectedStatus: DashboardTask["status"] | undefined,
  onStatusChange: (taskId: string, status: TaskStatus) => void
) {
  if (!selectedId || !selectedStatus) {
    return { handleComplete: undefined, handleReopen: undefined };
  }

  if (selectedStatus === "completed") {
    return {
      handleComplete: undefined,
      handleReopen: () => {
        void onStatusChange(selectedId, "pending");
      },
    };
  }

  return {
    handleComplete: () => {
      void onStatusChange(selectedId, "completed");
    },
    handleReopen: undefined,
  };
}

export function MyTaskView({ initialTasks, nowIso }: MyTaskViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(
    null
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [transitioningTaskId, setTransitioningTaskId] = useState<string | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const now = new Date(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const selectedTask = views.find((task) => task.id === selectedId) ?? null;
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const pendingDeleteTask =
    tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;

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
    } catch {
      setDeleteError("Could not delete task.");
      setPendingDeleteTaskId(null);
    }

    setDeletingTaskId(null);
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    if (transitioningTaskId !== null) {
      return;
    }

    setTransitioningTaskId(taskId);
    setStatusError(null);

    try {
      const result = await updateTaskStatusViaApi(taskId, status);

      if (!result.ok) {
        setStatusError(result.error);
        return;
      }

      setTasks((current) =>
        current.map((task) => (task.id === taskId ? result.task : task))
      );
    } catch {
      setStatusError("Could not update task status.");
    }

    setTransitioningTaskId(null);
  }

  const statusHandlers = detailPanelStatusHandlers(
    selectedId,
    selectedTask?.status,
    handleStatusChange
  );

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      {deleteError ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          {deleteError}
        </p>
      ) : null}
      {statusError ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          {statusError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
          <CardHeader>
            <h1 className="text-foreground font-sans text-[15px] font-medium">
              <span className="border-primary border-b-2 pb-0.5">My</span> Tasks
            </h1>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {views.length > 0 ? (
              <div className="flex flex-col gap-3">
                {views.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
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
                    <ListTodoIcon />
                  </EmptyMedia>
                  <EmptyTitle>No tasks yet</EmptyTitle>
                  <EmptyDescription>
                    Tasks you create will show up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
        <TaskDetailPanel
          task={selectedTask}
          onEdit={selectedId ? () => setEditingTaskId(selectedId) : undefined}
          onDelete={
            selectedId ? () => setPendingDeleteTaskId(selectedId) : undefined
          }
          deleting={selectedId !== null && deletingTaskId === selectedId}
          onComplete={statusHandlers.handleComplete}
          onReopen={statusHandlers.handleReopen}
          statusTransitioning={
            selectedId !== null && transitioningTaskId === selectedId
          }
        />
      </div>
      <EditTaskDialog
        task={editingTask}
        open={editingTask !== null}
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
        }}
      />
      <ConfirmDeleteTaskDialog
        open={pendingDeleteTaskId !== null}
        taskTitle={pendingDeleteTask?.title}
        isDeleting={
          pendingDeleteTaskId !== null && deletingTaskId === pendingDeleteTaskId
        }
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteTaskId(null);
          }
        }}
        onConfirm={() => {
          if (pendingDeleteTaskId) {
            void handleDeleteTask(pendingDeleteTaskId);
          }
        }}
      />
    </div>
  );
}
