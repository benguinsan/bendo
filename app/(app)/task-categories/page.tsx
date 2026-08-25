import type { Metadata } from "next";

import { TaskCategoriesView } from "@/components/task-categories/task-categories-view";

export const metadata: Metadata = {
  title: "Task Categories · bendo",
};

export default function TaskCategoriesPage() {
  return <TaskCategoriesView />;
}
