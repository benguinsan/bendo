"use client";

import { ListTodoIcon } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/dashboard/task-card";
import { TaskDetailPanel } from "@/components/my-task/task-detail-panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { DashboardTaskView } from "@/lib/dashboard/mock-data";

type MyTaskViewProps = {
  tasks: DashboardTaskView[];
};

export function MyTaskView({ tasks }: MyTaskViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    tasks[0]?.id ?? null
  );
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
          <CardHeader>
            <h1 className="text-foreground font-sans text-[15px] font-medium">
              <span className="border-primary border-b-2 pb-0.5">My</span> Tasks
            </h1>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {tasks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={task.id === selectedId}
                    href={`/my-task/${task.id}`}
                    onSelect={() => setSelectedId(task.id)}
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
        <TaskDetailPanel task={selectedTask} />
      </div>
    </div>
  );
}
