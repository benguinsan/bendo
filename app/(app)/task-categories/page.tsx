import type { Metadata } from "next";

import { TaskCategoriesView } from "@/components/task-categories/task-categories-view";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Task Categories · bendo",
};

export default async function TaskCategoriesPage() {
  await requireUser();
  return <TaskCategoriesView />;
}
