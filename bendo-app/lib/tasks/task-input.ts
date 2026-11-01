import { z } from "zod";

import type {
  DashboardTask,
  TaskPriority,
  TaskStatus,
} from "@/lib/dashboard/task-types";

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
  category?: string;
  description?: string;
  image?: string;
};

export const taskStatusSchema = z.enum(["pending", "completed"]);

export const taskPrioritySchema = z.enum(["low", "moderate", "extreme"]);

export const resourceIdSchema = z.uuid();

const thumbnailSrcSchema = z.string().max(2048).nullable();
const thumbnailAltSchema = z.string().max(200).nullable();

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function isValidCalendarDate(dateStr: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(dateStr)) {
    return false;
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export const calendarDateSchema = z
  .string()
  .min(1, "Date is required")
  .regex(CALENDAR_DATE_PATTERN, "Enter a valid date")
  .refine(isValidCalendarDate, "Enter a valid date");

/** JS `Date#getTimezoneOffset`: UTC minus local, minutes. UTC+7 → -420. */
const tzOffsetMinutesSchema = z.number().int().min(-840).max(840);

export const createTaskApiSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TASK_TITLE_MAX, `Title must be ${TASK_TITLE_MAX} characters or fewer`),
  date: calendarDateSchema,
  priority: taskPrioritySchema,
  description: z
    .string()
    .max(
      TASK_DESCRIPTION_MAX,
      `Description must be ${TASK_DESCRIPTION_MAX} characters or fewer`
    )
    .optional()
    .transform((value) => (value ?? "").trim()),
  categoryId: resourceIdSchema.nullable().optional(),
  thumbnailSrc: thumbnailSrcSchema.optional(),
  thumbnailAlt: thumbnailAltSchema.optional(),
  tzOffsetMinutes: tzOffsetMinutesSchema.optional(),
});

export const updateTaskApiSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(
        TASK_TITLE_MAX,
        `Title must be ${TASK_TITLE_MAX} characters or fewer`
      )
      .optional(),
    date: calendarDateSchema.optional(),
    priority: taskPrioritySchema.optional(),
    description: z
      .string()
      .max(
        TASK_DESCRIPTION_MAX,
        `Description must be ${TASK_DESCRIPTION_MAX} characters or fewer`
      )
      .transform((value) => value.trim())
      .optional(),
    status: taskStatusSchema.optional(),
    categoryId: resourceIdSchema.nullable().optional(),
    thumbnailSrc: thumbnailSrcSchema.optional(),
    thumbnailAlt: thumbnailAltSchema.optional(),
    tzOffsetMinutes: tzOffsetMinutesSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "At least one field is required" }
  );

export type CreateTaskApiInput = z.infer<typeof createTaskApiSchema>;
export type UpdateTaskApiInput = z.infer<typeof updateTaskApiSchema>;

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TASK_TITLE_MAX, `Title must be ${TASK_TITLE_MAX} characters or fewer`),
  date: calendarDateSchema,
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

/** Local UTC offset (getTimezoneOffset) on `dateStr`, read at local noon so DST matches that day. */
export function tzOffsetMinutesForDate(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getTimezoneOffset();
}

function dateKeyFromUtcMs(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** User's calendar date for `utcInstant`, given JS timezone offset (UTC − local). */
function userDateKey(utcInstant: Date, tzOffsetMinutes: number): string {
  return dateKeyFromUtcMs(utcInstant.getTime() - tzOffsetMinutes * 60_000);
}

/** Wall-clock in the user's zone → UTC ISO. */
function userWallClockToUtcIso(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  tzOffsetMinutes: number
): string {
  return new Date(
    Date.UTC(year, monthIndex, day, hour, minute, second, ms) +
      tzOffsetMinutes * 60_000
  ).toISOString();
}

/**
 * Build `scheduled_at` for a picked calendar date using the user's zone.
 * `tzOffsetMinutes` is `Date#getTimezoneOffset()` (UTC − local). Default 0 = UTC day.
 */
export function scheduledAtFromDateInput(
  dateStr: string,
  now: Date,
  tzOffsetMinutes = 0
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const monthIndex = month - 1;
  const noon = new Date(
    Date.UTC(year, monthIndex, day, 12, 0, 0) + tzOffsetMinutes * 60_000
  );
  const isToday = dateStr === userDateKey(now, tzOffsetMinutes);

  if (isToday && noon.getTime() <= now.getTime()) {
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    if (userDateKey(later, tzOffsetMinutes) === dateStr) {
      return later.toISOString();
    }

    return userWallClockToUtcIso(
      year,
      monthIndex,
      day,
      23,
      59,
      59,
      999,
      tzOffsetMinutes
    );
  }

  return noon.toISOString();
}

export function isPastCalendarDate(dateStr: string, now: Date): boolean {
  const selected = parseLocalDateInput(dateStr).getTime();
  const today = parseLocalDateInput(toLocalDateKey(now)).getTime();
  return selected < today;
}

export function isObjectThumbnailSrc(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export function countOpenTasksOnDate(
  tasks: DashboardTask[],
  dateKey: string,
  excludeTaskId?: string
): number {
  return tasks.filter(
    (task) =>
      task.id !== excludeTaskId &&
      task.status !== "completed" &&
      toLocalDateKey(new Date(task.scheduledAt)) === dateKey
  ).length;
}

export function hasDuplicateTask(
  tasks: DashboardTask[],
  title: string,
  dateKey: string,
  excludeTaskId?: string
): boolean {
  const normalized = normalizeTaskTitle(title);
  return tasks.some(
    (task) =>
      task.id !== excludeTaskId &&
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

export function validateUpdatedTask(input: {
  title: string;
  date: string;
  originalDate: string;
  priority: string;
  description: string;
  now: Date;
  existingTasks: DashboardTask[];
  taskId: string;
  status: TaskStatus;
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
  const isCompleted = input.status === "completed";
  const dateChanged = parsed.data.date !== input.originalDate;

  if (
    !isCompleted &&
    dateChanged &&
    isPastCalendarDate(parsed.data.date, input.now)
  ) {
    errors.date = "Choose today or a future date.";
  } else if (
    !isCompleted &&
    countOpenTasksOnDate(input.existingTasks, parsed.data.date, input.taskId) >=
      TASKS_PER_DATE_MAX
  ) {
    errors.date = "You already have 5 tasks on this date.";
  }

  if (
    hasDuplicateTask(
      input.existingTasks,
      parsed.data.title,
      parsed.data.date,
      input.taskId
    )
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
