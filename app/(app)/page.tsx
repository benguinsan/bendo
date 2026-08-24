import type { Metadata } from "next";

import { CompletedTaskPanel } from "@/components/dashboard/completed-task-panel";
import { TaskStatusPanel } from "@/components/dashboard/task-status-panel";
import { TodoColumn } from "@/components/dashboard/todo-column";
import { formatTodoDateLine } from "@/lib/dashboard/dates";
import {
  getCompletedLabel,
  getCompletedTasks,
  getMockTasks,
  getOpenTasks,
  getTaskStatusPercents,
  mockProfile,
  toTaskView,
} from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "Dashboard · bendo",
};

export default function DashboardPage() {
  const now = new Date();
  const tasks = getMockTasks(now).map((task) => toTaskView(task, now));
  const openTasks = getOpenTasks(tasks);
  const completedTasks = getCompletedTasks(tasks);
  const percents = getTaskStatusPercents(tasks);
  const completedLabels: Record<string, string> = {};

  for (const task of completedTasks) {
    completedLabels[task.id] = getCompletedLabel(task, now) ?? "";
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-foreground text-[28px] font-medium sm:text-[36px]">
        Welcome back, {mockProfile.firstName} 👋
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        <TodoColumn dateLine={formatTodoDateLine(now)} tasks={openTasks} />
        <div className="flex flex-col gap-6">
          <TaskStatusPanel percents={percents} />
          <CompletedTaskPanel
            tasks={completedTasks}
            completedLabels={completedLabels}
          />
        </div>
      </div>
    </div>
  );
}
