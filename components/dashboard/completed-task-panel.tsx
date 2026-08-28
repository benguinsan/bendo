import { CheckCircle2Icon } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  statusFillClass,
  statusLabels,
  statusTextClass,
  type DashboardTaskView,
} from "@/lib/dashboard/task-types";
import { cn } from "@/lib/utils";

type CompletedTaskPanelProps = {
  tasks: DashboardTaskView[];
  completedLabels: Record<string, string>;
};

export function CompletedTaskPanel({
  tasks,
  completedLabels,
}: CompletedTaskPanelProps) {
  return (
    <Card className="rounded-card shadow-panel py-5 ring-0">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2Icon className="text-primary" />
          <CardTitle className="text-primary font-sans text-[15px] font-medium">
            Completed Task
          </CardTitle>
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-card border-border/50 flex flex-col gap-3 border p-4"
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  statusFillClass[task.status]
                )}
              />
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="text-foreground text-base font-semibold">
                    {task.title}
                  </h3>
                  <p className="text-body text-sm">{task.description}</p>
                </div>
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={task.thumbnailSrc}
                    alt={task.thumbnailAlt}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              <p className="text-muted-foreground">
                Status:{" "}
                <span className={statusTextClass[task.status]}>
                  {statusLabels[task.status]}
                </span>
              </p>
              <p className="text-muted-foreground">
                {completedLabels[task.id]}
              </p>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
