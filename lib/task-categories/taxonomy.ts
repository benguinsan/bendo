import {
  priorityLabels,
  statusLabels,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/dashboard/task-types";

export type StatusTaxonomyRow = {
  id: TaskStatus;
  label: string;
};

export type PriorityTaxonomyRow = {
  id: TaskPriority;
  label: string;
};

export const statusTaxonomyRows: StatusTaxonomyRow[] = [
  { id: "completed", label: statusLabels.completed },
  { id: "in_progress", label: statusLabels.in_progress },
  { id: "not_started", label: statusLabels.not_started },
];

export const priorityTaxonomyRows: PriorityTaxonomyRow[] = [
  { id: "extreme", label: priorityLabels.extreme },
  { id: "moderate", label: priorityLabels.moderate },
  { id: "low", label: priorityLabels.low },
];
