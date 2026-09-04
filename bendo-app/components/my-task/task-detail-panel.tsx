import {
  CheckCircle2Icon,
  ListTodoIcon,
  RotateCcwIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react";

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

type TaskDetailPanelProps = {
  task: DashboardTaskView | null;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  onComplete?: () => void;
  onReopen?: () => void;
  statusTransitioning?: boolean;
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-foreground font-semibold">{label}:</span>{" "}
      <span className="text-body">{value}</span>
    </p>
  );
}

export function TaskDetailPanel({
  task,
  onEdit,
  onDelete,
  deleting = false,
  onComplete,
  onReopen,
  statusTransitioning = false,
}: TaskDetailPanelProps) {
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
                {task.categoryName ? (
                  <p className="text-sm">
                    Category:{" "}
                    <span className="text-foreground">{task.categoryName}</span>
                  </p>
                ) : null}
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
          <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-2">
            {task.status !== "completed" && onComplete ? (
              <Button
                type="button"
                size="sm"
                disabled={statusTransitioning}
                onClick={onComplete}
              >
                <CheckCircle2Icon />
                {statusTransitioning ? "Completing…" : "Mark complete"}
              </Button>
            ) : null}
            {task.status === "completed" && onReopen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={statusTransitioning}
                onClick={onReopen}
              >
                <RotateCcwIcon />
                {statusTransitioning ? "Reopening…" : "Reopen task"}
              </Button>
            ) : null}
            <div className="ml-auto flex gap-2">
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
            </div>
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
