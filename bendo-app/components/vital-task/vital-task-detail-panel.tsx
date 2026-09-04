import { CircleAlertIcon, SquarePenIcon, Trash2Icon } from "lucide-react";

import { TaskThumbnail } from "@/components/tasks/task-thumbnail";
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
} from "@/lib/dashboard/task-types";

type VitalTaskDetailPanelProps = {
  task: DashboardTaskView | null;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function VitalTaskDetailPanel({
  task,
  onEdit,
  onDelete,
  deleting = false,
}: VitalTaskDetailPanelProps) {
  const checklist = task?.checklist ?? [];

  return (
    <Card className="rounded-card shadow-panel flex min-h-0 flex-col py-5 ring-0 lg:h-full">
      {task ? (
        <>
          <CardHeader className="gap-4">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative size-40 shrink-0 overflow-hidden rounded-lg sm:size-44">
                <TaskThumbnail
                  src={task.thumbnailSrc}
                  alt={task.thumbnailAlt}
                  sizes="176px"
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
                  <span className={statusTextClass[task.displayStatus]}>
                    {statusLabels[task.displayStatus]}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Created on: {formatNumericDate(new Date(task.createdAt))}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
            <p className="text-body text-sm">{task.description}</p>
            {task.detailDescription ? (
              <p className="text-body text-sm">{task.detailDescription}</p>
            ) : null}
            {checklist.length > 0 ? (
              <ol className="text-body flex list-decimal flex-col gap-1 pl-5 text-sm">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : null}
          </CardContent>
          <CardContent className="mt-auto flex justify-end gap-2">
            <Button
              type="button"
              size="icon-lg"
              aria-label="Delete task"
              disabled={deleting || !onDelete}
              onClick={onDelete}
            >
              <Trash2Icon />
            </Button>
            <Button
              type="button"
              size="icon-lg"
              aria-label="Edit task"
              onClick={onEdit}
            >
              <SquarePenIcon />
            </Button>
          </CardContent>
        </>
      ) : (
        <CardContent className="flex flex-1 items-center justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>No task selected</EmptyTitle>
              <EmptyDescription>
                Choose a vital task from the list to see its details.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      )}
    </Card>
  );
}
