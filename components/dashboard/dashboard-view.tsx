"use client";

import { useState } from "react";

import { AddTaskDialog } from "@/components/dashboard/add-task-dialog";
import { CompletedTaskPanel } from "@/components/dashboard/completed-task-panel";
import { TaskStatusPanel } from "@/components/dashboard/task-status-panel";
import { TodoColumn } from "@/components/dashboard/todo-column";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import {
  getCompletedLabel,
  getCompletedTasks,
  getOpenTasks,
  getTaskStatusPercents,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/task-types";

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
  const now = new Date(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const openTasks = getOpenTasks(views);
  const completedTasks = getCompletedTasks(views);
  const percents = getTaskStatusPercents(tasks);
  const completedLabels: Record<string, string> = {};
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;

  for (const task of completedTasks) {
    completedLabels[task.id] = getCompletedLabel(task, now) ?? "";
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        <TodoColumn
          dateLine={dateLine}
          tasks={openTasks}
          onEditTask={setEditingTaskId}
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
    </>
  );
}
