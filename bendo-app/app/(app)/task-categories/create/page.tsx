import type { Metadata } from "next";

import { CreateCategoryView } from "@/components/task-categories/create-category-view";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Create Categories · bendo",
};

export default async function CreateCategoriesPage() {
  await requireUser();
  return <CreateCategoryView />;
}
