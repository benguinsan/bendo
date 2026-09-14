"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { LazyTaskFormDialog } from "@/components/tasks/lazy-dialogs";
import { Button } from "@/components/ui/button";
import type { DashboardTask } from "@/lib/dashboard/task-types";
import { createTaskViaApi } from "@/lib/tasks/task-api-client";
import { validateNewTask } from "@/lib/tasks/task-input";

type AddTaskDialogProps = {
  existingTasks: DashboardTask[];
  onCreate: (task: DashboardTask) => void;
};

export function AddTaskDialog({ existingTasks, onCreate }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="link" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Add task
      </Button>
      {open ? (
        <LazyTaskFormDialog
          open={open}
          onOpenChange={setOpen}
          heading={
            <>
              <span className="border-primary border-b-2 pb-0.5">Add</span> New
              Task
            </>
          }
          description="Create a new task with a title, date, priority, optional category, description, or image."
          onSubmit={async (values) => {
            const now = new Date();
            const result = validateNewTask({
              title: values.title,
              date: values.date,
              priority: values.priority,
              description: values.description,
              now,
              existingTasks,
            });

            if (!result.success) {
              return result.errors;
            }

            const created = await createTaskViaApi({
              title: result.data.title,
              description: result.data.description,
              date: result.data.date,
              priority: result.data.priority,
              categoryId: values.categoryId,
              thumbnailSrc: values.previewUrl,
            });

            if (!created.ok) {
              return created.errors;
            }

            onCreate(created.task);
            return null;
          }}
        />
      ) : null}
    </>
  );
}
