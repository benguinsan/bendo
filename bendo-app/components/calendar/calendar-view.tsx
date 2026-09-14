"use client";

import { CalendarDaysIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { TaskCard } from "@/components/dashboard/task-card";
import {
  LazyConfirmDeleteTaskDialog,
  LazyEditTaskDialog,
} from "@/components/tasks/lazy-dialogs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  addMonths,
  formatCalendarDayHeading,
  startOfMonth,
} from "@/lib/calendar/calendar-dates";
import {
  getTasksForDateKey,
  groupTasksByDateKey,
} from "@/lib/calendar/calendar-tasks";
import { toTaskView, type DashboardTask } from "@/lib/dashboard/task-types";
import { useNow } from "@/lib/dashboard/use-now";
import { deleteTaskViaApi } from "@/lib/tasks/task-api-client";
import { parseLocalDateInput, toLocalDateKey } from "@/lib/tasks/task-input";
import { cn } from "@/lib/utils";

type CalendarViewProps = {
  categoryTextByTaskId: Record<string, ReactNode>;
  initialTasks: DashboardTask[];
  nowIso: string;
};

function defaultSelectedDateKey(now: Date, visibleMonth: Date): string {
  const todayKey = toLocalDateKey(now);
  const monthStart = startOfMonth(visibleMonth);
  const nextMonthStart = addMonths(monthStart, 1);

  if (now >= monthStart && now < nextMonthStart) {
    return todayKey;
  }

  return toLocalDateKey(monthStart);
}

export function CalendarView({
  categoryTextByTaskId,
  initialTasks,
  nowIso,
}: CalendarViewProps) {
  const router = useRouter();
  const now = useNow(nowIso);
  const [tasks, setTasks] = useState(initialTasks);
  const [tasksBaseline, setTasksBaseline] = useState(initialTasks);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(now));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    defaultSelectedDateKey(now, startOfMonth(now))
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(
    null
  );
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const taskRefs = useRef(new Map<string, HTMLDivElement | null>());

  if (initialTasks !== tasksBaseline) {
    setTasksBaseline(initialTasks);
    setTasks(initialTasks);
  }

  const tasksByDate = useMemo(() => groupTasksByDateKey(tasks), [tasks]);
  const selectedDayTasks = getTasksForDateKey(tasksByDate, selectedDateKey);
  const selectedDayViews = selectedDayTasks.map((task) =>
    toTaskView(task, now)
  );
  const selectedDayDate = parseLocalDateInput(selectedDateKey);
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const pendingDeleteTask =
    tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;

  function refreshCategoryTextSlots() {
    router.refresh();
  }

  function handleMonthChange(nextMonth: Date) {
    setVisibleMonth(nextMonth);
    setSelectedDateKey(defaultSelectedDateKey(now, nextMonth));
    setSelectedTaskId(null);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedTaskId(null);
  }

  function handleSelectTask(taskId: string, dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedTaskId(taskId);
    const node = taskRefs.current.get(taskId);
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleDeleteTask(taskId: string) {
    if (deletingTaskId !== null) {
      return;
    }

    setDeletingTaskId(taskId);
    setDeleteError(null);

    try {
      const result = await deleteTaskViaApi(taskId);

      if (!result.ok) {
        setDeleteError(result.error);
        setDeletingTaskId(null);
        setPendingDeleteTaskId(null);
        return;
      }

      setTasks((current) => current.filter((task) => task.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
      setPendingDeleteTaskId(null);
      refreshCategoryTextSlots();
    } catch {
      setDeleteError("Could not delete task.");
      setPendingDeleteTaskId(null);
    }

    setDeletingTaskId(null);
  }

  function handleTaskUpdate(updated: DashboardTask) {
    if (updated.status === "completed") {
      setTasks((current) => current.filter((task) => task.id !== updated.id));
      if (selectedTaskId === updated.id) {
        setSelectedTaskId(null);
      }
      if (editingTaskId === updated.id) {
        setEditingTaskId(null);
      }
      refreshCategoryTextSlots();
      return;
    }

    setTasks((current) =>
      current.map((task) => (task.id === updated.id ? updated : task))
    );
    refreshCategoryTextSlots();
  }

  return (
    <div className="flex flex-col gap-6">
      {deleteError ? (
        <p className="text-destructive text-sm" role="alert">
          {deleteError}
        </p>
      ) : null}
      <CalendarMonthGrid
        monthDate={visibleMonth}
        now={now}
        tasksByDate={tasksByDate}
        selectedDateKey={selectedDateKey}
        onSelectDate={handleSelectDate}
        onSelectTask={handleSelectTask}
        onPreviousMonth={() => handleMonthChange(addMonths(visibleMonth, -1))}
        onNextMonth={() => handleMonthChange(addMonths(visibleMonth, 1))}
      />
      <Card className="rounded-card shadow-panel ring-0">
        <CardHeader>
          <h2 className="text-foreground text-lg font-semibold sm:text-xl">
            {formatCalendarDayHeading(selectedDayDate)}
          </h2>
        </CardHeader>
        <CardContent>
          {selectedDayViews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {selectedDayViews.map((task) => (
                <div
                  key={task.id}
                  ref={(node) => {
                    taskRefs.current.set(task.id, node);
                  }}
                  className={cn(
                    selectedTaskId === task.id &&
                      "rounded-card ring-primary/40 ring-2"
                  )}
                >
                  <TaskCard
                    task={task}
                    categoryText={categoryTextByTaskId[task.id]}
                    selected={selectedTaskId === task.id}
                    href={`/my-task/${task.id}`}
                    onEdit={() => setEditingTaskId(task.id)}
                    onDelete={() => setPendingDeleteTaskId(task.id)}
                    deleting={deletingTaskId === task.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDaysIcon />
                </EmptyMedia>
                <EmptyTitle>No tasks scheduled</EmptyTitle>
                <EmptyDescription>
                  Open tasks for this day will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
      {editingTask ? (
        <LazyEditTaskDialog
          task={editingTask}
          open
          existingTasks={tasks}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingTaskId(null);
            }
          }}
          onUpdate={handleTaskUpdate}
        />
      ) : null}
      {pendingDeleteTaskId ? (
        <LazyConfirmDeleteTaskDialog
          open
          taskTitle={pendingDeleteTask?.title}
          isDeleting={deletingTaskId === pendingDeleteTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteTaskId(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteTask(pendingDeleteTaskId);
          }}
        />
      ) : null}
    </div>
  );
}
