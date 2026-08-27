import "server-only";
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
  const { data, error } = await supabase.rpc("create_category_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_name: parsed.data.name,
  });

  if (error || !data) {
    return error
      ? mapSupabaseError(error)
      : fail("INTERNAL", "Could not create category.");
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("update_category_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_category_id: parsedId.data,
    p_name: parsed.data.name,
  });

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("CATEGORY_NOT_FOUND", "Category not found.");
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

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("delete_category_with_activity", {
    p_clerk_user_id: userId,
    p_actor_clerk_user_id: userId,
    p_category_id: parsedId.data,
  });

  if (error) {
    return mapSupabaseError(error);
  }

  if (!data) {
    return fail("CATEGORY_NOT_FOUND", "Category not found.");
  }

  return ok({ id: data });
}
