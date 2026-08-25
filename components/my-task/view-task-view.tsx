import { CircleAlertIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  type DashboardTaskView,
} from "@/lib/dashboard/mock-data";

type ViewTaskViewProps = {
  task: DashboardTaskView;
};

export function ViewTaskView({ task }: ViewTaskViewProps) {
  const checklist = task.checklist ?? [];
  const optionalItems = task.optionalItems ?? [];

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <Card className="rounded-card shadow-panel flex min-h-0 flex-1 flex-col py-6 ring-0 lg:h-full">
        <CardHeader className="gap-5">
          <div className="flex flex-col items-start gap-5 lg:flex-row">
            <div className="relative size-48 shrink-0 overflow-hidden rounded-lg lg:size-52">
              <Image
                src={task.thumbnailSrc}
                alt={task.thumbnailAlt}
                fill
                unoptimized
                sizes="208px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="text-foreground font-sans text-xl font-semibold lg:text-2xl">
                {task.title}
              </h1>
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
          <p className="text-body text-sm">{task.description}</p>
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
          <Button type="button" size="icon-lg" aria-label="Edit task">
            <SquarePenIcon />
          </Button>
          <Button type="button" size="icon-lg" aria-label="Mark vital">
            <CircleAlertIcon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
