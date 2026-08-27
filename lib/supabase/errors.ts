import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

export type ServiceErrorCode =
  | "VALIDATION"
  | "SCHEDULE_IN_PAST"
  | "TASKS_PER_DATE_MAX"
  | "DUPLICATE_TASK"
  | "DUPLICATE_CATEGORY"
  | "TASK_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "INTERNAL";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ServiceErrorCode; message: string };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ServiceErrorCode,
  message: string
): ServiceResult<never> {
  return { ok: false, code, message };
}

export function fromZodError(error: z.ZodError): ServiceResult<never> {
  return fail("VALIDATION", error.issues[0]?.message ?? "Invalid input");
}

export function mapSupabaseError(error: PostgrestError): ServiceResult<never> {
  const blob = `${error.code} ${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;

  if (blob.includes("TASKS_PER_DATE_MAX")) {
    return fail("TASKS_PER_DATE_MAX", "You already have 5 tasks on this date.");
  }

  if (blob.includes("SCHEDULE_IN_PAST")) {
    return fail(
      "SCHEDULE_IN_PAST",
      "Incomplete tasks cannot use a scheduled time in the past."
    );
  }

  if (error.code === "23505") {
    if (blob.includes("categories_clerk_user_id_lower_name")) {
      return fail(
        "DUPLICATE_CATEGORY",
        "A category with this name already exists."
      );
    }

    return fail(
      "DUPLICATE_TASK",
      "A task with this title already exists at this time."
    );
  }

  if (error.code === "23514") {
    return fail("VALIDATION", "Task fields are invalid.");
  }

  return fail("INTERNAL", "The request could not be completed.");
}
