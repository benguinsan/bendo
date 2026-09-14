"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AddTaskDialog } from "@/components/dashboard/add-task-dialog";
import { TodoColumn } from "@/components/dashboard/todo-column";
import {
  LazyConfirmDeleteTaskDialog,
  LazyEditTaskDialog,
} from "@/components/tasks/lazy-dialogs";
import {
  getOpenTasks,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/task-types";
import { useNow } from "@/lib/dashboard/use-now";
import { deleteTaskViaApi } from "@/lib/tasks/task-api-client";

type DashboardViewProps = {
  dateLine: ReactNode;
  categoryTextByTaskId: Record<string, ReactNode>;
  initialTasks: DashboardTask[];
  nowIso: string;
};

export function DashboardView({
  dateLine,
  categoryTextByTaskId,
  initialTasks,
  nowIso,
}: DashboardViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [tasksBaseline, setTasksBaseline] = useState(initialTasks);
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
  const openTasks = getOpenTasks(views);
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const pendingDeleteTask =
    tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;

  function refreshStaticPanels() {
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
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
      setPendingDeleteTaskId(null);
      refreshStaticPanels();
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
      <TodoColumn
        dateLine={dateLine}
        categoryTextByTaskId={categoryTextByTaskId}
        tasks={openTasks}
        onEditTask={setEditingTaskId}
        onDeleteTask={setPendingDeleteTaskId}
        deletingTaskId={deletingTaskId}
        addTaskTrigger={
          <AddTaskDialog
            existingTasks={tasks}
            onCreate={(task) => {
              setTasks((current) => [task, ...current]);
              refreshStaticPanels();
            }}
          />
        }
      />
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
            refreshStaticPanels();
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
