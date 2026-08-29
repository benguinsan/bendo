"use client";

import { CircleAlertIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { TaskThumbnail } from "@/components/tasks/task-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { formatNumericDate } from "@/lib/dashboard/dates";
import {
  priorityLabels,
  priorityTextClass,
  statusLabels,
  statusTextClass,
  toTaskView,
  type DashboardTask,
} from "@/lib/dashboard/task-types";

type ViewTaskViewProps = {
  initialTask: DashboardTask;
  nowIso: string;
};

export function ViewTaskView({ initialTask, nowIso }: ViewTaskViewProps) {
  const [task, setTask] = useState(initialTask);
  const [editOpen, setEditOpen] = useState(false);
  const view = toTaskView(task, new Date(nowIso));
  const checklist = view.checklist ?? [];
  const optionalItems = view.optionalItems ?? [];

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <Card className="rounded-card shadow-panel flex min-h-0 flex-1 flex-col py-6 ring-0 lg:h-full">
        <CardHeader className="gap-5">
          <div className="flex flex-col items-start gap-5 lg:flex-row">
            <div className="relative size-48 shrink-0 overflow-hidden rounded-lg lg:size-52">
              <TaskThumbnail
                src={view.thumbnailSrc}
                alt={view.thumbnailAlt}
                sizes="208px"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="text-foreground font-sans text-xl font-semibold lg:text-2xl">
                {view.title}
              </h1>
              <p className="text-sm">
                Priority:{" "}
                <span className={priorityTextClass[view.priority]}>
                  {priorityLabels[view.priority]}
                </span>
              </p>
              <p className="text-sm">
                Status:{" "}
                <span className={statusTextClass[view.status]}>
                  {statusLabels[view.status]}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                Created on: {formatNumericDate(new Date(view.createdAt))}
              </p>
            </div>
          </div>
          <CardAction>
            <Link
              href="/my-task"
              className="text-foreground text-sm underline underline-offset-2"
            >
              Go Back
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          <p className="text-body text-sm">{view.description}</p>
          {checklist.length > 0 ? (
            <ol className="text-body flex list-decimal flex-col gap-1 pl-5 text-sm">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : null}
          {optionalItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-foreground text-sm font-semibold">
                Optional:
              </h2>
              <ul className="text-body flex list-disc flex-col gap-1 pl-5 text-sm">
                {optionalItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
        <CardContent className="mt-auto flex justify-end gap-2">
          <Button type="button" size="icon-lg" aria-label="Delete task">
            <Trash2Icon />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            aria-label="Edit task"
            onClick={() => setEditOpen(true)}
          >
            <SquarePenIcon />
          </Button>
          <Button type="button" size="icon-lg" aria-label="Mark vital">
            <CircleAlertIcon />
          </Button>
        </CardContent>
      </Card>
      <EditTaskDialog
        task={task}
        open={editOpen}
        existingTasks={[task]}
        onOpenChange={setEditOpen}
        onUpdate={setTask}
      />
    </div>
  );
}
