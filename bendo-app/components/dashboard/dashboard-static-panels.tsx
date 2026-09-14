import { CompletedTaskPanel } from "@/components/dashboard/completed-task-panel";
import { TaskStatusPanel } from "@/components/dashboard/task-status-panel";
import {
  getCompletedLabel,
  getCompletedTasks,
  getTaskStatusPercents,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/task-types";

type DashboardStaticPanelsProps = {
  tasks: DashboardTask[];
  now: Date;
};

export function DashboardStaticPanels({
  tasks,
  now,
}: DashboardStaticPanelsProps) {
  const views = tasks.map((task) => toTaskView(task, now));
  const completedTasks = getCompletedTasks(views);
  const percents = getTaskStatusPercents(tasks, now);
  const completedLabels: Record<string, string> = {};

  for (const task of completedTasks) {
    completedLabels[task.id] = getCompletedLabel(task, now) ?? "";
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskStatusPanel percents={percents} />
      <CompletedTaskPanel
        tasks={completedTasks}
        completedLabels={completedLabels}
      />
    </div>
  );
}
