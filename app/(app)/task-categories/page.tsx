import type { Metadata } from "next";

import { TaskCategoriesView } from "@/components/task-categories/task-categories-view";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserCategories } from "@/lib/task-categories/load-categories";

export const metadata: Metadata = {
  title: "Task Categories · bendo",
};

export default async function TaskCategoriesPage() {
  const user = await requireUser();
  const categories = await loadUserCategories(user.id);

  return <TaskCategoriesView initialCategories={categories} />;
}
