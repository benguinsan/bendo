"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Image from "next/image";

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
  statusFillClass,
  statusLabels,
  statusTextClass,
  type DashboardTaskView,
} from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  task: DashboardTaskView;
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="rounded-card border-border/50 border py-5 ring-0">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 font-sans text-base font-semibold">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              statusFillClass[task.status]
            )}
          />
          {task.title}
        </CardTitle>
        <CardAction>
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
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex gap-4">
        <p className="text-body min-w-0 flex-1 text-sm">{task.description}</p>
        <div className="relative h-[72px] w-[90px] shrink-0 overflow-hidden rounded-lg sm:h-[88px] sm:w-[118px]">
          <Image
            src={task.thumbnailSrc}
            alt={task.thumbnailAlt}
            fill
            unoptimized
            sizes="118px"
            className="object-cover"
          />
        </div>
      </CardContent>
      <CardContent className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-[10px]">
        <p>
          Priority:{" "}
          <span className="text-priority-moderate">
            {priorityLabels[task.priority]}
          </span>
        </p>
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
