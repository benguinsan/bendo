import { z } from "zod";

import type { DashboardTask, TaskPriority } from "@/lib/dashboard/mock-data";

export const TASK_TITLE_MAX = 120;
export const TASK_DESCRIPTION_MAX = 2000;
export const TASKS_PER_DATE_MAX = 5;
export const TASK_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const TASK_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const PLACEHOLDER_THUMBNAIL_SRC = "/dashboard/thumb-placeholder.svg";

export type TaskFormFieldErrors = {
  title?: string;
  date?: string;
  priority?: string;
  description?: string;
  image?: string;
};

const taskPrioritySchema = z.enum(["low", "moderate", "extreme"]);

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TASK_TITLE_MAX, `Title must be ${TASK_TITLE_MAX} characters or fewer`),
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date"),
  priority: z.string().min(1, "Select a priority").pipe(taskPrioritySchema),
  description: z
    .string()
    .max(
      TASK_DESCRIPTION_MAX,
      `Description must be ${TASK_DESCRIPTION_MAX} characters or fewer`
    )
    .transform((value) => value.trim()),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function normalizeTaskTitle(title: string): string {
  return title.trim().replaceAll(/\s+/gu, " ").toLowerCase();
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateInput(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isPastCalendarDate(dateStr: string, now: Date): boolean {
  const selected = parseLocalDateInput(dateStr).getTime();
  const today = parseLocalDateInput(toLocalDateKey(now)).getTime();
  return selected < today;
}

export function countOpenTasksOnDate(
  tasks: DashboardTask[],
  dateKey: string
): number {
  return tasks.filter(
    (task) =>
      task.status !== "completed" &&
      toLocalDateKey(new Date(task.scheduledAt)) === dateKey
  ).length;
}

export function hasDuplicateTask(
  tasks: DashboardTask[],
  title: string,
  dateKey: string
): boolean {
  const normalized = normalizeTaskTitle(title);
  return tasks.some(
    (task) =>
      toLocalDateKey(new Date(task.scheduledAt)) === dateKey &&
      normalizeTaskTitle(task.title) === normalized
  );
}

export function validateTaskImage(file: File): string | null {
  if (
    !TASK_IMAGE_MIME_TYPES.includes(
      file.type as (typeof TASK_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return "Use a PNG, JPEG, WebP, or GIF image.";
  }

  if (file.size > TASK_IMAGE_MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }

  return null;
}

function fieldErrorsFromZod(error: z.ZodError): TaskFormFieldErrors {
  const fieldErrors: TaskFormFieldErrors = {};

  for (const issue of error.issues) {
    const [key] = issue.path;
    if (
      key === "title" ||
      key === "date" ||
      key === "priority" ||
      key === "description"
    ) {
      fieldErrors[key] ??= issue.message;
    }
  }

  return fieldErrors;
}

export function validateNewTask(input: {
  title: string;
  date: string;
  priority: string;
  description: string;
  now: Date;
  existingTasks: DashboardTask[];
}):
  | { success: true; data: TaskFormValues }
  | { success: false; errors: TaskFormFieldErrors } {
  const parsed = taskFormSchema.safeParse({
    title: input.title,
    date: input.date,
    priority: input.priority,
    description: input.description,
  });

  if (!parsed.success) {
    return { success: false, errors: fieldErrorsFromZod(parsed.error) };
  }

  const errors: TaskFormFieldErrors = {};

  if (isPastCalendarDate(parsed.data.date, input.now)) {
    errors.date = "Choose today or a future date.";
  } else if (
    countOpenTasksOnDate(input.existingTasks, parsed.data.date) >=
    TASKS_PER_DATE_MAX
  ) {
    errors.date = "You already have 5 tasks on this date.";
  }

  if (
    hasDuplicateTask(input.existingTasks, parsed.data.title, parsed.data.date)
  ) {
    errors.title = "A task with this title already exists on this date.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: parsed.data };
}

export const priorityOptions: {
  value: TaskPriority;
  label: string;
  dotClass: string;
}[] = [
  { value: "extreme", label: "Extreme", dotClass: "bg-priority-extreme" },
  { value: "moderate", label: "Moderate", dotClass: "bg-priority-moderate" },
  { value: "low", label: "Low", dotClass: "bg-priority-low" },
];
