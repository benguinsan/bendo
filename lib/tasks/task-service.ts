import "server-only";
import {
  recordActivity,
  type ActivityAction,
} from "@/lib/activities/activity-service";
import type { TaskPriority, TaskStatus } from "@/lib/dashboard/mock-data";
import type { Tables } from "@/lib/supabase/database.types";
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

function buildTaskUpdateFields(
  patch: UpdateTaskApiInput,
  existing: TaskRow,
  now: Date
) {
  const nextDate = patch.date ?? existing.scheduled_date;
  let nextScheduledAt = existing.scheduled_at;

  if (patch.scheduledAt) {
    nextScheduledAt = patch.scheduledAt;
  } else if (patch.date && patch.date !== existing.scheduled_date) {
    nextScheduledAt = scheduledAtFromDateInput(patch.date, now);
  }

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
    scheduled_at: nextScheduledAt,
    scheduled_date: nextDate,
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

function activityForTaskUpdate(
  previous: TaskRow,
  next: TaskRow
): ActivityAction {
  if (previous.status !== "completed" && next.status === "completed") {
    return "task_completed";
  }

  if (previous.status === "completed" && next.status !== "completed") {
    return "task_reopened";
  }

  return "task_updated";
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

  const scheduledAt =
    body.scheduledAt ?? scheduledAtFromDateInput(body.date, now);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      clerk_user_id: userId,
      content: body.title,
      description: body.description,
      priority: body.priority,
      scheduled_at: scheduledAt,
      scheduled_date: body.date,
      category_id: body.categoryId ?? null,
      thumbnail_src: body.thumbnailSrc ?? null,
      thumbnail_alt: body.thumbnailAlt ?? null,
      status: "not_started",
    })
    .select("*")
    .single();

  if (error || !data) {
    return error
      ? mapSupabaseError(error)
      : fail("INTERNAL", "Could not create task.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: "task_created",
    entityType: "task",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
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
  const { data, error } = await supabase
    .from("tasks")
    .update(buildTaskUpdateFields(patch, existing.data, now))
    .eq("id", parsedId.data)
    .eq("clerk_user_id", userId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("TASK_NOT_FOUND", "Task not found.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: activityForTaskUpdate(existing.data, data),
    entityType: "task",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
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

  const existing = await getLiveTaskRow(userId, parsedId.data);
  if (!existing.ok) {
    return existing;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("clerk_user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("TASK_NOT_FOUND", "Task not found.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: "task_deleted",
    entityType: "task",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
  }

  return ok({ id: data.id });
}
