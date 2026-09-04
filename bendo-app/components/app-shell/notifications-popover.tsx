"use client";

import { BellIcon, Undo2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

import { TaskThumbnail } from "@/components/tasks/task-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  priorityLabels,
  priorityTextClass,
  type DashboardTask,
} from "@/lib/dashboard/task-types";
import { useNow } from "@/lib/dashboard/use-now";
import {
  formatCompactRelativeTime,
  groupNotificationTasks,
} from "@/lib/notifications/notification-feed";
import { listTasksViaApi } from "@/lib/tasks/task-api-client";
import { cn } from "@/lib/utils";

/**
 * Notifications popover component that displays incomplete tasks grouped by scheduled date.
 * Loads tasks when opened and allows dismissing individual notifications.
 */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const now = useNow(nowIso);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    /**
     * Fetches tasks from the API and updates component state.
     */
    async function loadTasks() {
      setLoading(true);
      setError(null);

      const result = await listTasksViaApi();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setTasks([]);
        setError(result.error);
        setLoading(false);
        return;
      }

      setTasks(result.tasks);
      setLoading(false);
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const visibleTasks = tasks.filter((task) => !dismissedIds.has(task.id));
  const groups = groupNotificationTasks(visibleTasks, now);
  const headerGroupLabel = groups[0]?.label ?? null;

  /**
   * Handles popover open/close state changes. Updates the current timestamp when opening.
   */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setNowIso(new Date().toISOString());
    }

    setOpen(nextOpen);
  }

  /**
   * Dismisses a notification by adding its task ID to the dismissed set.
   * Prevents event propagation to avoid navigation.
   */
  function handleDismiss(event: MouseEvent<HTMLButtonElement>, taskId: string) {
    event.preventDefault();
    event.stopPropagation();
    setDismissedIds((current) => new Set(current).add(taskId));
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button type="button" size="icon-lg" aria-label="Notifications" />
        }
      >
        <BellIcon />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-lg"
      >
        <PopoverHeader className="bg-popover gap-2 px-5 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <PopoverTitle className="text-foreground text-lg font-semibold">
              Notifications
            </PopoverTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-primary hover:text-primary"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <Undo2Icon />
            </Button>
          </div>
          {headerGroupLabel ? (
            <p className="text-muted-foreground text-sm">{headerGroupLabel}</p>
          ) : null}
        </PopoverHeader>

        <div className="bg-secondary flex max-h-[min(28rem,70vh)] flex-col gap-5 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : null}

          {!loading && error ? (
            <p className="text-muted-foreground text-sm">{error}</p>
          ) : null}

          {!loading && !error && groups.length === 0 ? (
            <Empty className="border-0 p-4">
              <EmptyHeader>
                <EmptyTitle>No notifications</EmptyTitle>
                <EmptyDescription>
                  Incomplete tasks show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!loading && !error
            ? groups.map((group, groupIndex) => (
                <div key={group.dateKey} className="flex flex-col gap-5">
                  {groupIndex > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {group.label}
                    </p>
                  ) : null}
                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-1">
                      <Link
                        href={`/my-task/${task.id}`}
                        className="hover:bg-muted/40 focus-visible:ring-ring flex min-w-0 flex-1 items-start gap-3 rounded-md outline-none focus-visible:ring-2"
                        onClick={() => setOpen(false)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start gap-2">
                            <p className="text-foreground min-w-0 flex-1 text-sm font-medium">
                              {task.title}
                            </p>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatCompactRelativeTime(task.createdAt, now)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm">
                            <span className="text-foreground">Priority: </span>
                            <span
                              className={cn(priorityTextClass[task.priority])}
                            >
                              {priorityLabels[task.priority]}
                            </span>
                          </p>
                        </div>
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-md">
                          <TaskThumbnail
                            src={task.thumbnailSrc}
                            alt={task.thumbnailAlt}
                            sizes="64px"
                          />
                        </div>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="Remove notification"
                        onClick={(event) => handleDismiss(event, task.id)}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
