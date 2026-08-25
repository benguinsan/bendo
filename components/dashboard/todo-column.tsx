import { ClipboardListIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TaskCard } from "@/components/dashboard/task-card";
import { Separator } from "@/components/ui/separator";
import type { DashboardTaskView } from "@/lib/dashboard/mock-data";

type TodoColumnProps = {
  dateLine: string;
  tasks: DashboardTaskView[];
  addTaskTrigger: ReactNode;
};

export function TodoColumn({
  dateLine,
  tasks,
  addTaskTrigger,
}: TodoColumnProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-primary flex items-center gap-2 text-[15px] font-medium">
          <ClipboardListIcon />
          <h2>To-Do</h2>
        </div>
        {addTaskTrigger}
      </div>
      <Separator />
      <p className="text-muted-foreground text-sm">{dateLine}</p>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} href={`/my-task/${task.id}`} />
        ))}
      </div>
    </section>
  );
}
