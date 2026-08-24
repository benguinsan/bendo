import { ListTodoIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatNumericDate } from "@/lib/dashboard/dates";
import {
  priorityLabels,
  priorityTextClass,
  statusLabels,
  statusTextClass,
  type DashboardTaskView,
} from "@/lib/dashboard/mock-data";

type TaskDetailPanelProps = {
  task: DashboardTaskView | null;
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-foreground font-semibold">{label}:</span>{" "}
      <span className="text-body">{value}</span>
    </p>
  );
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  return (
    <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
      {task ? (
        <>
          <CardHeader className="gap-4">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative size-40 shrink-0 overflow-hidden rounded-lg sm:size-44">
                <Image
                  src={task.thumbnailSrc}
                  alt={task.thumbnailAlt}
                  fill
                  unoptimized
                  sizes="176px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h2 className="text-foreground font-sans text-lg font-semibold sm:text-xl">
                  {task.title}
                </h2>
                <p className="text-sm">
                  Priority:{" "}
                  <span className={priorityTextClass[task.priority]}>
                    {priorityLabels[task.priority]}
                  </span>
                </p>
                <p className="text-sm">
                  Status:{" "}
                  <span className={statusTextClass[task.status]}>
                    {statusLabels[task.status]}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Created on: {formatNumericDate(new Date(task.createdAt))}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {task.contentTitle ? (
              <DetailLine label="Task Title" value={task.contentTitle} />
            ) : null}
            {task.objective ? (
              <DetailLine label="Objective" value={task.objective} />
            ) : null}
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-semibold">
                Task Description:
              </p>
              <p className="text-body text-sm">{task.description}</p>
            </div>
            {task.additionalNotes && task.additionalNotes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-foreground text-sm font-semibold">
                  Additional Notes:
                </p>
                <ul className="text-body flex list-disc flex-col gap-1 pl-5 text-sm">
                  {task.additionalNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {task.deadlineLabel ? (
              <DetailLine
                label="Deadline for Submission"
                value={task.deadlineLabel}
              />
            ) : null}
          </CardContent>
          <CardContent className="mt-auto flex justify-end gap-2">
            <Button type="button" size="icon-lg" aria-label="Delete task">
              <Trash2Icon />
            </Button>
            <Button type="button" size="icon-lg" aria-label="Edit task">
              <SquarePenIcon />
            </Button>
          </CardContent>
        </>
      ) : (
        <CardContent className="flex flex-1 items-center justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodoIcon />
              </EmptyMedia>
              <EmptyTitle>No task selected</EmptyTitle>
              <EmptyDescription>
                Choose a task from the list to see its details.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      )}
    </Card>
  );
}
