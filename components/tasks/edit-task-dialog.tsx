"use client";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { DashboardTask } from "@/lib/dashboard/task-types";
import { updateTaskViaApi } from "@/lib/tasks/task-api-client";
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
              categoryId: task.categoryId,
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
      description="Edit this task title, date, priority, category, description, or image."
      onSubmit={async (values) => {
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

        const updated = await updateTaskViaApi({
          taskId: task.id,
          title: result.data.title,
          description: result.data.description,
          date: result.data.date,
          priority: result.data.priority,
          categoryId: values.categoryId,
          thumbnailSrc: values.previewUrl,
        });

        if (!updated.ok) {
          return updated.errors;
        }

        onUpdate(updated.task);
        return null;
      }}
    />
  );
}
