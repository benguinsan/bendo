"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  buildMonthGrid,
  formatCalendarMonthYear,
  getCalendarWeekdayLabels,
  isSameLocalDay,
  type CalendarDay,
} from "@/lib/calendar/calendar-dates";
import {
  CALENDAR_MAX_VISIBLE_PILLS,
  calendarPriorityPillClass,
  getTasksForDateKey,
} from "@/lib/calendar/calendar-tasks";
import type { DashboardTask } from "@/lib/dashboard/task-types";
import { cn } from "@/lib/utils";

type CalendarMonthGridProps = {
  monthDate: Date;
  now: Date;
  tasksByDate: Map<string, DashboardTask[]>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onSelectTask?: (taskId: string, dateKey: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

function formatDayAriaLabel(day: CalendarDay, taskCount: number): string {
  const label = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(day.date);

  if (taskCount === 0) {
    return label;
  }

  if (taskCount === 1) {
    return `${label}, 1 task`;
  }

  return `${label}, ${taskCount} tasks`;
}

function DayCell({
  day,
  now,
  tasks,
  selected,
  onSelectDate,
  onSelectTask,
}: {
  day: CalendarDay;
  now: Date;
  tasks: DashboardTask[];
  selected: boolean;
  onSelectDate: (dateKey: string) => void;
  onSelectTask?: (taskId: string, dateKey: string) => void;
}) {
  const isToday = isSameLocalDay(day.date, now);
  const dayNumber = day.date.getDate();
  const visibleTasks = tasks.slice(0, CALENDAR_MAX_VISIBLE_PILLS);
  const hiddenCount = tasks.length - visibleTasks.length;
  const dayAriaLabel = formatDayAriaLabel(day, tasks.length);

  return (
    <td className="align-top">
      <div className="flex min-h-[100px] flex-col gap-1 p-1 sm:min-h-[120px] sm:p-1.5">
        <button
          type="button"
          aria-label={dayAriaLabel}
          aria-pressed={selected}
          className="focus-visible:ring-ring/50 flex min-h-0 flex-1 flex-col rounded-md outline-none focus-visible:ring-2"
          onClick={() => onSelectDate(day.dateKey)}
        >
          <span className="flex w-full justify-end">
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center text-sm tabular-nums",
                isToday
                  ? "bg-foreground text-background rounded-full font-semibold"
                  : [
                      selected && "ring-foreground/20 rounded-full ring-2",
                      day.inCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                    ]
              )}
            >
              {dayNumber}
            </span>
          </span>
        </button>
        {day.inCurrentMonth ? (
          <div className="flex flex-col gap-1">
            {visibleTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                aria-label={task.title}
                className={cn(
                  "focus-visible:ring-ring/50 w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] outline-none focus-visible:ring-2 sm:text-xs",
                  calendarPriorityPillClass[task.priority]
                )}
                onClick={() => onSelectTask?.(task.id, day.dateKey)}
              >
                {task.title}
              </button>
            ))}
            {hiddenCount > 0 ? (
              <button
                type="button"
                className="text-primary w-full text-left text-[11px] font-medium hover:underline"
                onClick={() => onSelectDate(day.dateKey)}
              >
                view more
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </td>
  );
}

function chunkWeeks(days: CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

export function CalendarMonthGrid({
  monthDate,
  now,
  tasksByDate,
  selectedDateKey,
  onSelectDate,
  onSelectTask,
  onPreviousMonth,
  onNextMonth,
}: CalendarMonthGridProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const days = buildMonthGrid(year, month);
  const weeks = chunkWeeks(days);
  const weekdayLabels = getCalendarWeekdayLabels();
  const monthLabel = formatCalendarMonthYear(monthDate);

  return (
    <Card className="rounded-card shadow-panel bg-card ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <h1 className="text-foreground text-xl font-semibold sm:text-2xl">
          {monthLabel}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={onPreviousMonth}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <table
          className="w-full border-collapse"
          aria-label={`Calendar for ${monthLabel}`}
        >
          <thead>
            <tr className="border-border/40 border-b">
              {weekdayLabels.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="text-muted-foreground pb-2 text-left text-xs font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]?.dateKey ?? "week"}>
                {week.map((day) => (
                  <DayCell
                    key={day.dateKey}
                    day={day}
                    now={now}
                    selected={day.dateKey === selectedDateKey}
                    tasks={
                      day.inCurrentMonth
                        ? getTasksForDateKey(tasksByDate, day.dateKey)
                        : []
                    }
                    onSelectDate={onSelectDate}
                    onSelectTask={onSelectTask}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
