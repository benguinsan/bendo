import "server-only";
import { cloudListCategories, isCloudSupabaseMode } from "@/lib/api/cloud";
import { listCategories } from "@/lib/task-categories/category-service";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";

export type { PersistedCategory } from "@/lib/task-categories/persisted-category";

export async function loadUserCategories(
  userId: string
): Promise<PersistedCategory[]> {
  if (isCloudSupabaseMode()) {
    void userId;
    return cloudListCategories();
  }

  const result = await listCategories(userId);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.data;
}
