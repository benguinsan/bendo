import type { DashboardTask } from "@/lib/dashboard/task-types";

/**
 * Pick which full committed task snapshot to show.
 * Recency = server `updatedAt` only (not arrival order).
 * Equal stamps keep `current` so ambiguous overlaps do not drop local values.
 * Different ids always take `incoming` (task identity changed).
 */
export function selectCommittedTaskSnapshot(
  current: DashboardTask,
  incoming: DashboardTask
): DashboardTask {
  if (current.id !== incoming.id) {
    return incoming;
  }

  const currentUpdatedAt = Date.parse(current.updatedAt);
  const incomingUpdatedAt = Date.parse(incoming.updatedAt);

  if (incomingUpdatedAt > currentUpdatedAt) {
    return incoming;
  }

  return current;
}
