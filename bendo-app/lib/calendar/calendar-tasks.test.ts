import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DashboardTask } from "../dashboard/task-types";
import {
  getCalendarTasks,
  getTasksForDateKey,
  groupTasksByDateKey,
} from "./calendar-tasks";

const baseTask: DashboardTask = {
  id: "task-1",
  title: "Beta task",
  description: "Description",
  status: "pending",
  priority: "moderate",
  categoryId: null,
  categoryName: null,
  createdAt: "2026-03-15T08:00:00.000Z",
  scheduledAt: "2026-03-15T12:00:00.000Z",
  completedAt: null,
  thumbnailSrc: "/dashboard/thumb-placeholder.svg",
  thumbnailAlt: "Task image",
};

describe("getCalendarTasks", () => {
  it("excludes completed tasks", () => {
    const completed: DashboardTask = {
      ...baseTask,
      id: "task-2",
      status: "completed",
      completedAt: "2026-03-16T08:00:00.000Z",
    };

    assert.deepEqual(getCalendarTasks([baseTask, completed]), [baseTask]);
  });
});

describe("groupTasksByDateKey", () => {
  it("groups open tasks by local scheduled date and sorts by title", () => {
    const alpha: DashboardTask = { ...baseTask, id: "task-a", title: "Alpha" };
    const beta: DashboardTask = {
      ...baseTask,
      id: "task-b",
      title: "Beta",
      scheduledAt: "2026-03-15T15:00:00.000Z",
    };
    const otherDay: DashboardTask = {
      ...baseTask,
      id: "task-c",
      title: "Other day",
      scheduledAt: "2026-03-16T12:00:00.000Z",
    };
    const completed: DashboardTask = {
      ...baseTask,
      id: "task-d",
      status: "completed",
      completedAt: "2026-03-15T18:00:00.000Z",
    };

    const grouped = groupTasksByDateKey([beta, otherDay, alpha, completed]);

    assert.deepEqual(
      getTasksForDateKey(grouped, "2026-03-15").map((task) => task.title),
      ["Alpha", "Beta"]
    );
    assert.deepEqual(
      getTasksForDateKey(grouped, "2026-03-16").map((task) => task.title),
      ["Other day"]
    );
  });
});
