const dateLocale = "en-GB";

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale, { weekday: "long" }).format(date);
}

export function formatNumericDate(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTodoDateLine(date: Date): string {
  const day = new Intl.DateTimeFormat(dateLocale, { day: "numeric" }).format(
    date
  );
  const month = new Intl.DateTimeFormat(dateLocale, { month: "long" }).format(
    date
  );
  return `${day} ${month} • Today`;
}

export function formatRelativeCompleted(
  completedAt: string,
  now: Date
): string {
  const then = new Date(completedAt);
  const diffMs = now.getTime() - then.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (days === 0) {
    return "Completed today";
  }

  if (days === 1) {
    return "Completed 1 day ago";
  }

  return `Completed ${days} days ago`;
}
