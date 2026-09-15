import type { DashboardTask } from "@/lib/dashboard/task-types";

type SearchableTask = Pick<
  DashboardTask,
  "title" | "description" | "categoryName"
>;

/**
 * Normalizes a `q` search param into a single trimmed query string.
 */
export function normalizeTaskSearchQuery(
  raw: string | string[] | undefined
): string {
  if (Array.isArray(raw)) {
    return (raw[0] ?? "").trim();
  }

  return (raw ?? "").trim();
}

/**
 * Filters tasks by case-insensitive match on title, description, or category name.
 */
export function filterTasksByQuery<T extends SearchableTask>(
  tasks: T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return tasks;
  }

  return tasks.filter((task) => {
    if (task.title.toLowerCase().includes(normalized)) {
      return true;
    }

    if (task.description.toLowerCase().includes(normalized)) {
      return true;
    }

    return Boolean(task.categoryName?.toLowerCase().includes(normalized));
  });
}
