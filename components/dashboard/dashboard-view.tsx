"use client";

import { useState } from "react";

import { AddTaskDialog } from "@/components/dashboard/add-task-dialog";
import { CompletedTaskPanel } from "@/components/dashboard/completed-task-panel";
import { TaskStatusPanel } from "@/components/dashboard/task-status-panel";
import { TodoColumn } from "@/components/dashboard/todo-column";
import { ConfirmDeleteTaskDialog } from "@/components/tasks/confirm-delete-task-dialog";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import {
  getCompletedLabel,
  getCompletedTasks,
  getOpenTasks,
  getTaskStatusPercents,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/task-types";
import { useNow } from "@/lib/dashboard/use-now";
import { deleteTaskViaApi } from "@/lib/tasks/task-api-client";

type DashboardViewProps = {
  dateLine: string;
  initialTasks: DashboardTask[];
  nowIso: string;
};

export function DashboardView({
  dateLine,
  initialTasks,
  nowIso,
}: DashboardViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(
    null
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const now = useNow(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const openTasks = getOpenTasks(views);
  const completedTasks = getCompletedTasks(views);
  const percents = getTaskStatusPercents(tasks, now);
  const completedLabels: Record<string, string> = {};
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const pendingDeleteTask =
    tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;

  for (const task of completedTasks) {
    completedLabels[task.id] = getCompletedLabel(task, now) ?? "";
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

  return (
    <>
      {deleteError ? (
        <p className="text-destructive text-sm" role="alert">
          {deleteError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        <TodoColumn
          dateLine={dateLine}
          tasks={openTasks}
          onEditTask={setEditingTaskId}
          onDeleteTask={setPendingDeleteTaskId}
          deletingTaskId={deletingTaskId}
          addTaskTrigger={
            <AddTaskDialog
              existingTasks={tasks}
              onCreate={(task) => setTasks((current) => [task, ...current])}
            />
          }
        />
        <div className="flex flex-col gap-6">
          <TaskStatusPanel percents={percents} />
          <CompletedTaskPanel
            tasks={completedTasks}
            completedLabels={completedLabels}
          />
        </div>
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
    </>
  );
}
