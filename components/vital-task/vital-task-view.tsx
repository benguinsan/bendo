"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/dashboard/task-card";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
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

type VitalTaskViewProps = {
  initialTasks: DashboardTask[];
  nowIso: string;
};

export function VitalTaskView({ initialTasks, nowIso }: VitalTaskViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const now = new Date(nowIso);
  const views = tasks.map((task) => toTaskView(task, now));
  const selectedTask = views.find((task) => task.id === selectedId) ?? null;
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,423fr)_minmax(0,511fr)] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
          <CardHeader>
            <h1 className="text-foreground font-sans text-[15px] font-medium">
              <span className="border-primary border-b-2 pb-0.5">Vital</span>{" "}
              Tasks
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
    </div>
  );
}
