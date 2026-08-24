"use client";

import { useState } from "react";

import { AddTaskDialog } from "@/components/dashboard/add-task-dialog";
import { CompletedTaskPanel } from "@/components/dashboard/completed-task-panel";
import { TaskStatusPanel } from "@/components/dashboard/task-status-panel";
import { TodoColumn } from "@/components/dashboard/todo-column";
import {
  getCompletedLabel,
  getCompletedTasks,
  getOpenTasks,
  getTaskStatusPercents,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/mock-data";

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
  const now = new Date(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const openTasks = getOpenTasks(views);
  const completedTasks = getCompletedTasks(views);
  const percents = getTaskStatusPercents(tasks);
  const completedLabels: Record<string, string> = {};

  for (const task of completedTasks) {
    completedLabels[task.id] = getCompletedLabel(task, now) ?? "";
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
      <TodoColumn
        dateLine={dateLine}
        tasks={openTasks}
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
  );
}
