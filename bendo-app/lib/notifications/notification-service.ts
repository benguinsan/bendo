import "server-only";
import { z } from "zod";

import type { Tables } from "@/lib/supabase/database.types";
import {
  fail,
  fromZodError,
  mapSupabaseError,
  ok,
  type ServiceResult,
} from "@/lib/supabase/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resourceIdSchema } from "@/lib/tasks/task-input";

export type PersistedNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  taskId: string | null;
  createdAt: string;
};

type NotificationRow = Tables<"notifications">;

export const createNotificationApiSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z
    .string()
    .max(2000)
    .optional()
    .transform((value) => (value ?? "").trim()),
  taskId: resourceIdSchema.nullable().optional(),
});

function toPersistedNotification(row: NotificationRow): PersistedNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    taskId: row.task_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function assertOwnedTask(
  userId: string,
  taskId: string
): Promise<ServiceResult<{ id: string }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
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

export async function listNotifications(
  userId: string
): Promise<ServiceResult<PersistedNotification[]>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return mapSupabaseError(error);
  }

  return ok((data ?? []).map((row) => toPersistedNotification(row)));
}

export async function createNotification(
  userId: string,
  input: unknown
): Promise<ServiceResult<PersistedNotification>> {
  const parsed = createNotificationApiSchema.safeParse(input);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  if (parsed.data.taskId) {
    const task = await assertOwnedTask(userId, parsed.data.taskId);
    if (!task.ok) {
      return task;
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      clerk_user_id: userId,
      title: parsed.data.title,
      body: parsed.data.body,
      task_id: parsed.data.taskId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return error
      ? mapSupabaseError(error)
      : fail("INTERNAL", "Could not create notification.");
  }

  return ok(toPersistedNotification(data));
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<ServiceResult<PersistedNotification>> {
  const parsedId = resourceIdSchema.safeParse(notificationId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid notification id.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("clerk_user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("NOTIFICATION_NOT_FOUND", "Notification not found.");
  }

  return ok(toPersistedNotification(data));
}
