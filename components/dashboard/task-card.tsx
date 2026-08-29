"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";

import { TaskThumbnail } from "@/components/tasks/task-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumericDate } from "@/lib/dashboard/dates";
import {
  priorityLabels,
  priorityTextClass,
  statusFillClass,
  statusLabels,
  statusTextClass,
  type DashboardTaskView,
} from "@/lib/dashboard/task-types";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  task: DashboardTaskView;
  selected?: boolean;
  href?: string;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function TaskCard({
  task,
  selected = false,
  href,
  onSelect,
  onEdit,
  onDelete,
  deleting = false,
}: TaskCardProps) {
  const selectable = Boolean(onSelect);
  const linked = Boolean(href) && !onSelect;
  const hasOverlay = selectable || linked;

  return (
    <Card
      className={cn(
        "rounded-card relative border py-5 ring-0",
        selected ? "border-primary" : "border-border/50"
      )}
    >
      {onSelect ? (
        <button
          type="button"
          className="rounded-card absolute inset-0 z-0"
          aria-current={selected ? "true" : undefined}
          aria-label={`View ${task.title}`}
          onClick={onSelect}
        />
      ) : null}
      {linked && href ? (
        <Link
          href={href}
          className="rounded-card absolute inset-0 z-0"
          aria-label={`View ${task.title}`}
        />
      ) : null}
      <CardHeader
        className={cn(hasOverlay && "pointer-events-none relative z-10")}
      >
        <CardTitle className="text-foreground flex items-center gap-2 font-sans text-base font-semibold">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              statusFillClass[task.status]
            )}
          />
          {task.title}
        </CardTitle>
        <CardAction className={cn(hasOverlay && "pointer-events-auto")}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Actions for ${task.title}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              <DropdownMenuGroup>
                {href ? (
                  <DropdownMenuItem
                    nativeButton={false}
                    render={<Link href={href} />}
                  >
                    View
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting || !onDelete}
                  onClick={onDelete}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent
        className={cn(
          "flex gap-4",
          hasOverlay && "pointer-events-none relative z-10"
        )}
      >
        <p className="text-body line-clamp-3 min-w-0 flex-1 text-sm">
          {task.description}
        </p>
        <div className="relative h-[72px] w-[90px] shrink-0 overflow-hidden rounded-lg sm:h-[88px] sm:w-[118px]">
          <TaskThumbnail
            src={task.thumbnailSrc}
            alt={task.thumbnailAlt}
            sizes="118px"
          />
        </div>
      </CardContent>
      <CardContent
        className={cn(
          "text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-[10px]",
          hasOverlay && "pointer-events-none relative z-10"
        )}
      >
        <p>
          Priority:{" "}
          <span className={priorityTextClass[task.priority]}>
            {priorityLabels[task.priority]}
          </span>
        </p>
        {task.categoryName ? (
          <p>
            Category:{" "}
            <span className="text-foreground">{task.categoryName}</span>
          </p>
        ) : null}
        <p>
          Status:{" "}
          <span className={statusTextClass[task.status]}>
            {statusLabels[task.status]}
          </span>
        </p>
        <p>Created on: {formatNumericDate(new Date(task.createdAt))}</p>
      </CardContent>
    </Card>
  );
}
