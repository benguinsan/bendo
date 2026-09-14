"use client";

import dynamic from "next/dynamic";

export const LazyEditTaskDialog = dynamic(
  async () => {
    const mod = await import("@/components/tasks/edit-task-dialog");
    return { default: mod.EditTaskDialog };
  },
  { ssr: false, loading: () => null }
);

export const LazyConfirmDeleteTaskDialog = dynamic(
  async () => {
    const mod = await import("@/components/tasks/confirm-delete-task-dialog");
    return { default: mod.ConfirmDeleteTaskDialog };
  },
  { ssr: false, loading: () => null }
);

export const LazyTaskFormDialog = dynamic(
  async () => {
    const mod = await import("@/components/tasks/task-form-dialog");
    return { default: mod.TaskFormDialog };
  },
  { ssr: false, loading: () => null }
);

export const LazyEditCategoryDialog = dynamic(
  async () => {
    const mod =
      await import("@/components/task-categories/edit-category-dialog");
    return { default: mod.EditCategoryDialog };
  },
  { ssr: false, loading: () => null }
);

export const LazyTaxonomyLabelDialog = dynamic(
  async () => {
    const mod =
      await import("@/components/task-categories/edit-taxonomy-dialog");
    return { default: mod.TaxonomyLabelDialog };
  },
  { ssr: false, loading: () => null }
);
