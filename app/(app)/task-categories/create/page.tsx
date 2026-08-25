import type { Metadata } from "next";

import { CreateCategoryView } from "@/components/task-categories/create-category-view";

export const metadata: Metadata = {
  title: "Create Categories · bendo",
};

export default function CreateCategoriesPage() {
  return <CreateCategoryView />;
}
