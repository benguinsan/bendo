import { ClipboardListIcon, PlusIcon } from "lucide-react";

import { TaskCard } from "@/components/dashboard/task-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DashboardTaskView } from "@/lib/dashboard/mock-data";

type TodoColumnProps = {
  dateLine: string;
  tasks: DashboardTaskView[];
};

export function TodoColumn({ dateLine, tasks }: TodoColumnProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-primary flex items-center gap-2 text-[15px] font-medium">
          <ClipboardListIcon />
          <h2>To-Do</h2>
        </div>
        <Button type="button" variant="link">
          <PlusIcon data-icon="inline-start" />
          Add task
        </Button>
      </div>
      <Separator />
      <p className="text-muted-foreground text-sm">{dateLine}</p>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
