"use client";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { DashboardTask } from "@/lib/dashboard/mock-data";
import { updateMockTask } from "@/lib/tasks/create-mock-task";
import { toLocalDateKey, validateUpdatedTask } from "@/lib/tasks/task-input";

type EditTaskDialogProps = {
  task: DashboardTask | null;
  open: boolean;
  existingTasks: DashboardTask[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: DashboardTask) => void;
};

export function EditTaskDialog({
  task,
  open,
  existingTasks,
  onOpenChange,
  onUpdate,
}: EditTaskDialogProps) {
  return (
    <TaskFormDialog
      open={open && task !== null}
      onOpenChange={onOpenChange}
      initialValues={
        task
          ? {
              title: task.title,
              date: toLocalDateKey(new Date(task.scheduledAt)),
              priority: task.priority,
              description: task.description,
              previewUrl: task.thumbnailSrc,
            }
          : undefined
      }
      heading={
        <>
          <span className="border-primary border-b-2 pb-0.5">Edit</span> Task
        </>
      }
      description="Edit this task title, date, priority, description, or image."
      onSubmit={(values) => {
        if (!task) {
          return {};
        }

        const now = new Date();
        const result = validateUpdatedTask({
          title: values.title,
          date: values.date,
          priority: values.priority,
          description: values.description,
          now,
          existingTasks,
          taskId: task.id,
          status: task.status,
        });

        if (!result.success) {
          return result.errors;
        }

        onUpdate(
          updateMockTask({
            task,
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
