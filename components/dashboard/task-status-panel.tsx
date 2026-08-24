import { ActivityIcon } from "lucide-react";

import { StatusDonut } from "@/components/dashboard/status-donut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { StatusPercents } from "@/lib/dashboard/mock-data";

type TaskStatusPanelProps = {
  percents: StatusPercents;
};

export function TaskStatusPanel({ percents }: TaskStatusPanelProps) {
  return (
    <Card className="rounded-card shadow-panel py-5 ring-0">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="text-primary" />
          <CardTitle className="text-primary font-sans text-[15px] font-medium">
            Task Status
          </CardTitle>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <StatusDonut
            percent={percents.completed}
            label="Completed"
            strokeClassName="stroke-status-completed"
            dotClassName="bg-status-completed"
          />
          <StatusDonut
            percent={percents.inProgress}
            label="In Progress"
            strokeClassName="stroke-status-in-progress"
            dotClassName="bg-status-in-progress"
          />
          <StatusDonut
            percent={percents.notStarted}
            label="Not Started"
            strokeClassName="stroke-status-not-started"
            dotClassName="bg-status-not-started"
          />
        </div>
      </CardContent>
    </Card>
  );
}
