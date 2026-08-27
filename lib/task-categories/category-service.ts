import "server-only";
import { recordActivity } from "@/lib/activities/activity-service";
import type { Tables } from "@/lib/supabase/database.types";
import {
  fail,
  fromZodError,
  mapSupabaseError,
  ok,
  type ServiceResult,
} from "@/lib/supabase/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { categoryWriteSchema } from "@/lib/task-categories/category-input";
import { resourceIdSchema } from "@/lib/tasks/task-input";

export type PersistedCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = Tables<"categories">;

function toPersistedCategory(row: CategoryRow): PersistedCategory {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function getOwnedCategoryRow(
  userId: string,
  categoryId: string
): Promise<ServiceResult<CategoryRow>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
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

export async function listCategories(
  userId: string
): Promise<ServiceResult<PersistedCategory[]>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    return mapSupabaseError(error);
  }

  return ok((data ?? []).map((row) => toPersistedCategory(row)));
}

export async function createCategory(
  userId: string,
  input: unknown
): Promise<ServiceResult<PersistedCategory>> {
  const parsed = categoryWriteSchema.safeParse(input);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      clerk_user_id: userId,
      name: parsed.data.name,
    })
    .select("*")
    .single();

  if (error || !data) {
    return error
      ? mapSupabaseError(error)
      : fail("INTERNAL", "Could not create category.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: "category_created",
    entityType: "category",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
  }

  return ok(toPersistedCategory(data));
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: unknown
): Promise<ServiceResult<PersistedCategory>> {
  const parsedId = resourceIdSchema.safeParse(categoryId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid category id.");
  }

  const parsed = categoryWriteSchema.safeParse(input);
  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const existing = await getOwnedCategoryRow(userId, parsedId.data);
  if (!existing.ok) {
    return existing;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsedId.data)
    .eq("clerk_user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("CATEGORY_NOT_FOUND", "Category not found.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: "category_updated",
    entityType: "category",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
  }

  return ok(toPersistedCategory(data));
}

export async function deleteCategory(
  userId: string,
  categoryId: string
): Promise<ServiceResult<{ id: string }>> {
  const parsedId = resourceIdSchema.safeParse(categoryId);
  if (!parsedId.success) {
    return fail("VALIDATION", "Enter a valid category id.");
  }

  const existing = await getOwnedCategoryRow(userId, parsedId.data);
  if (!existing.ok) {
    return existing;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsedId.data)
    .eq("clerk_user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("CATEGORY_NOT_FOUND", "Category not found.");
  }

  const activity = await recordActivity({
    userId,
    actorUserId: userId,
    action: "category_deleted",
    entityType: "category",
    entityId: data.id,
  });

  if (!activity.ok) {
    return activity;
  }

  return ok({ id: data.id });
}
