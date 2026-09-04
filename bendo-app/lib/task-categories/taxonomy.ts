import {
  priorityLabels,
  statusLabels,
  type TaskDisplayStatus,
  type TaskPriority,
} from "@/lib/dashboard/task-types";

export type StatusTaxonomyRow = {
  id: TaskDisplayStatus;
  label: string;
};

export type PriorityTaxonomyRow = {
  id: TaskPriority;
  label: string;
};

export const statusTaxonomyRows: StatusTaxonomyRow[] = [
  { id: "completed", label: statusLabels.completed },
  { id: "expired", label: statusLabels.expired },
  { id: "pending", label: statusLabels.pending },
];

export const priorityTaxonomyRows: PriorityTaxonomyRow[] = [
  { id: "extreme", label: priorityLabels.extreme },
  { id: "moderate", label: priorityLabels.moderate },
  { id: "low", label: priorityLabels.low },
];
