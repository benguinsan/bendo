import type { TaskPriority } from "@/lib/dashboard/task-types";
import {
  persistedTaskToDashboard,
  type PersistedTask,
} from "@/lib/tasks/persisted-task";
import {
  isObjectThumbnailSrc,
  type TaskFormFieldErrors,
} from "@/lib/tasks/task-input";

type TaskApiErrorCode =
  | "VALIDATION"
  | "SCHEDULE_IN_PAST"
  | "TASKS_PER_DATE_MAX"
  | "DUPLICATE_TASK"
  | "CATEGORY_NOT_FOUND"
  | "INTERNAL";

type ApiErrorBody = {
  error: string;
  code?: TaskApiErrorCode;
};

type ApiSuccessBody = {
  data: PersistedTask;
};

export type CreateTaskClientInput = {
  title: string;
  description: string;
  date: string;
  priority: TaskPriority;
  categoryId: string | null;
  thumbnailSrc: string | null;
};

export type UpdateTaskClientInput = {
  taskId: string;
  title: string;
  description: string;
  date: string;
  priority: TaskPriority;
  categoryId: string | null;
  thumbnailSrc: string | null;
};

function mapApiErrorToFields(body: ApiErrorBody): TaskFormFieldErrors {
  switch (body.code) {
    case "TASKS_PER_DATE_MAX":
    case "SCHEDULE_IN_PAST": {
      return { date: body.error };
    }
    case "DUPLICATE_TASK": {
      return { title: body.error };
    }
    case "CATEGORY_NOT_FOUND": {
      return { category: body.error };
    }
    default: {
      return { title: body.error };
    }
  }
}

export async function createTaskViaApi(
  input: CreateTaskClientInput
): Promise<
  | { ok: true; task: ReturnType<typeof persistedTaskToDashboard> }
  | { ok: false; errors: TaskFormFieldErrors }
> {
  const thumbnailSrc =
    input.thumbnailSrc && !isObjectThumbnailSrc(input.thumbnailSrc)
      ? input.thumbnailSrc
      : undefined;

  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        date: input.date,
        priority: input.priority,
        categoryId: input.categoryId,
        ...(thumbnailSrc
          ? { thumbnailSrc, thumbnailAlt: "Uploaded task image" }
          : {}),
      }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, errors: { title: "Could not create task." } };
    }

    if (!response.ok) {
      const body = payload as ApiErrorBody;
      return {
        ok: false,
        errors: mapApiErrorToFields({
          error: body.error ?? "Could not create task.",
          code: body.code,
        }),
      };
    }

    const body = payload as ApiSuccessBody;
    return { ok: true, task: persistedTaskToDashboard(body.data) };
  } catch {
    return { ok: false, errors: { title: "Could not create task." } };
  }
}

export async function updateTaskViaApi(
  input: UpdateTaskClientInput
): Promise<
  | { ok: true; task: ReturnType<typeof persistedTaskToDashboard> }
  | { ok: false; errors: TaskFormFieldErrors }
> {
  const thumbnailSrc =
    input.thumbnailSrc && !isObjectThumbnailSrc(input.thumbnailSrc)
      ? input.thumbnailSrc
      : undefined;

  try {
    const response = await fetch(`/api/tasks/${input.taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        date: input.date,
        priority: input.priority,
        categoryId: input.categoryId,
        ...(thumbnailSrc
          ? { thumbnailSrc, thumbnailAlt: "Uploaded task image" }
          : {}),
      }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, errors: { title: "Could not update task." } };
    }

    if (!response.ok) {
      const body = payload as ApiErrorBody;
      return {
        ok: false,
        errors: mapApiErrorToFields({
          error: body.error ?? "Could not update task.",
          code: body.code,
        }),
      };
    }

    const body = payload as ApiSuccessBody;
    return { ok: true, task: persistedTaskToDashboard(body.data) };
  } catch {
    return { ok: false, errors: { title: "Could not update task." } };
  }
}
