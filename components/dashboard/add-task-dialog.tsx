"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import type { DashboardTask } from "@/lib/dashboard/mock-data";
import { createMockTask } from "@/lib/tasks/create-mock-task";
import { validateNewTask } from "@/lib/tasks/task-input";

type AddTaskDialogProps = {
  existingTasks: DashboardTask[];
  onCreate: (task: DashboardTask) => void;
};

export function AddTaskDialog({ existingTasks, onCreate }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <TaskFormDialog
      open={open}
      onOpenChange={setOpen}
      heading={
        <>
          <span className="border-primary border-b-2 pb-0.5">Add</span> New Task
        </>
      }
      description="Create a new task with a title, date, priority, and optional description or image."
      trigger={
        <DialogTrigger render={<Button type="button" variant="link" />}>
          <PlusIcon data-icon="inline-start" />
          Add task
        </DialogTrigger>
      }
      onSubmit={(values) => {
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

        onCreate(
          createMockTask({
            title: result.data.title,
            description: result.data.description,
            date: result.data.date,
            priority: result.data.priority,
            thumbnailSrc: values.previewUrl,
            now,
          })
        );
        return null;
      }}
    />
  );
}
