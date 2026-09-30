import "server-only";
import { isCloudPrivilegeMode } from "@/lib/api/cloud-privilege";
import { cloudListCategories } from "@/lib/api/cloud-privilege-loaders";
import { listCategories } from "@/lib/task-categories/category-service";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";

export type { PersistedCategory } from "@/lib/task-categories/persisted-category";

export async function loadUserCategories(
  userId: string
): Promise<PersistedCategory[]> {
  if (isCloudPrivilegeMode()) {
    void userId;
    return cloudListCategories();
  }

  const result = await listCategories(userId);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.data;
}
