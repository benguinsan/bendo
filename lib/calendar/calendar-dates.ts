import { toLocalDateKey } from "@/lib/tasks/task-input";

const dateLocale = "en-GB";

export type CalendarDay = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

export function formatCalendarMonthYear(date: Date): string {
  const month = new Intl.DateTimeFormat(dateLocale, { month: "long" }).format(
    date
  );
  const year = new Intl.DateTimeFormat(dateLocale, { year: "numeric" }).format(
    date
  );
  return `${month} ${year}`;
}

export function formatCalendarDayHeading(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getCalendarWeekdayLabels(): readonly string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(year, month, 1 - firstOfMonth.getDay());
  const endDate = new Date(
    year,
    month,
    lastOfMonth.getDate() + (6 - lastOfMonth.getDay())
  );

  const days: CalendarDay[] = [];
  const dayCount =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  for (let offset = 0; offset < dayCount; offset += 1) {
    const cursor = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + offset
    );

    days.push({
      date: cursor,
      dateKey: toLocalDateKey(cursor),
      inCurrentMonth: cursor.getMonth() === month,
    });
  }

  return days;
}
