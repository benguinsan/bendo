import "server-only";
import type { TaskPriority, TaskStatus } from "@/lib/dashboard/mock-data";
import type { Json, Tables } from "@/lib/supabase/database.types";
import {
  fail,
  fromZodError,
  mapSupabaseError,
  ok,
  type ServiceResult,
} from "@/lib/supabase/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { scheduledAtFromDateInput } from "@/lib/tasks/create-mock-task";
import {
  createTaskApiSchema,
  resourceIdSchema,
  updateTaskApiSchema,
  type CreateTaskApiInput,
  type UpdateTaskApiInput,
} from "@/lib/tasks/task-input";

export type PersistedTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  scheduledAt: string;
  scheduledDate: string;
  completedAt: string | null;
  thumbnailSrc: string | null;
  thumbnailAlt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

type TaskRow = Tables<"tasks">;

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function buildTaskUpdateFields(patch: UpdateTaskApiInput, now: Date) {
  const nextDate = patch.date;

  return {
    ...(patch.title === undefined ? {} : { content: patch.title }),
    ...(patch.description === undefined
      ? {}
      : { description: patch.description }),
    ...(patch.priority === undefined ? {} : { priority: patch.priority }),
    ...(patch.status === undefined ? {} : { status: patch.status }),
    ...(patch.categoryId === undefined
      ? {}
      : { category_id: patch.categoryId }),
    ...(patch.thumbnailSrc === undefined
      ? {}
      : { thumbnail_src: patch.thumbnailSrc }),
    ...(patch.thumbnailAlt === undefined
      ? {}
      : { thumbnail_alt: patch.thumbnailAlt }),
    ...(nextDate === undefined
      ? {}
      : {
          scheduled_date: nextDate,
          scheduled_at: scheduledAtFromDateInput(nextDate, now),
        }),
  };
}

function toPersistedTask(row: TaskRow, now = new Date()): PersistedTask {
  const status = row.status as TaskStatus;
  const scheduledAt = toIso(row.scheduled_at);

  return {
    id: row.id,
    title: row.content,
    description: row.description,
    status,
    priority: row.priority as TaskPriority,
    categoryId: row.category_id,
    scheduledAt,
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    thumbnailSrc: row.thumbnail_src,
    thumbnailAlt: row.thumbnail_alt,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    isOverdue: status !== "completed" && new Date(scheduledAt) < now,
  };
}

async function getOwnedCategory(
  userId: string,
  categoryId: string
): Promise<ServiceResult<{ id: string }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("CATEGORY_NOT_FOUND", "Category not found.");
  }

  return ok(data);
}

async function getLiveTaskRow(
  userId: string,
  taskId: string
): Promise<ServiceResult<TaskRow>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("clerk_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("TASK_NOT_FOUND", "Task not found.");
  }

  return ok(data);
}

export async function listTasks(
  userId: string
): Promise<ServiceResult<PersistedTask[]>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("clerk_user_id", userId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return mapSupabaseError(error);
  }

  return ok((data ?? []).map((row) => toPersistedTask(row)));
}

export async function getTask(
  userId: string,
  taskId: string
): Promise<ServiceResult<PersistedTask>> {
  const parsedId = resourceIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid task id.");
  }

  const row = await getLiveTaskRow(userId, parsedId.data);
  if (!row.ok) {
    return row;
  }

  return ok(toPersistedTask(row.data));
}

export async function createTask(
  userId: string,
  input: unknown,
  now = new Date()
): Promise<ServiceResult<PersistedTask>> {
  const parsed = createTaskApiSchema.safeParse(input);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const body: CreateTaskApiInput = parsed.data;

  if (body.categoryId) {
    const category = await getOwnedCategory(userId, body.categoryId);
    if (!category.ok) {
      return category;
    }
  }

  const scheduledAt = scheduledAtFromDateInput(body.date, now);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("create_task_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_content: body.title,
    p_description: body.description,
    p_priority: body.priority,
    p_scheduled_at: scheduledAt,
    p_scheduled_date: body.date,
    p_category_id: body.categoryId ?? null,
    p_thumbnail_src: body.thumbnailSrc ?? null,
    p_thumbnail_alt: body.thumbnailAlt ?? null,
  });

  if (error || !data) {
    return error
      ? mapSupabaseError(error)
      : fail("INTERNAL", "Could not create task.");
  }

  return ok(toPersistedTask(data, now));
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: unknown,
  now = new Date()
): Promise<ServiceResult<PersistedTask>> {
  const parsedId = resourceIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid task id.");
  }

  const parsed = updateTaskApiSchema.safeParse(input);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const patch: UpdateTaskApiInput = parsed.data;
  const existing = await getLiveTaskRow(userId, parsedId.data);
  if (!existing.ok) {
    return existing;
  }

  if (patch.categoryId) {
    const category = await getOwnedCategory(userId, patch.categoryId);
    if (!category.ok) {
      return category;
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("update_task_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_task_id: parsedId.data,
    p_patch: buildTaskUpdateFields(patch, now) as Json,
  });

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("TASK_NOT_FOUND", "Task not found.");
  }

  return ok(toPersistedTask(data, now));
}

export async function deleteTask(
  userId: string,
  taskId: string
): Promise<ServiceResult<{ id: string }>> {
  const parsedId = resourceIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid task id.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("delete_task_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_task_id: parsedId.data,
  });

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("TASK_NOT_FOUND", "Task not found.");
  }

  return ok({ id: data });
}
