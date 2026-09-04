import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DashboardTask } from "../dashboard/task-types";
import {
  formatCompactRelativeTime,
  formatNotificationGroupLabel,
  getNotificationTasks,
  groupNotificationTasks,
} from "./notification-feed";

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

describe("getNotificationTasks", () => {
  it("excludes completed tasks and sorts by createdAt descending", () => {
    const older: DashboardTask = {
      ...baseTask,
      id: "task-old",
      title: "Older",
      createdAt: "2026-03-14T08:00:00.000Z",
    };
    const newer: DashboardTask = {
      ...baseTask,
      id: "task-new",
      title: "Newer",
      createdAt: "2026-03-16T08:00:00.000Z",
    };
    const completed: DashboardTask = {
      ...baseTask,
      id: "task-done",
      status: "completed",
      completedAt: "2026-03-16T09:00:00.000Z",
    };

    assert.deepEqual(
      getNotificationTasks([older, completed, newer]).map((task) => task.id),
      ["task-new", "task-old"]
    );
  });
});

describe("formatCompactRelativeTime", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  it("returns now under one minute", () => {
    assert.equal(
      formatCompactRelativeTime("2026-03-15T11:59:30.000Z", now),
      "now"
    );
  });

  it("returns minutes under one hour", () => {
    assert.equal(
      formatCompactRelativeTime("2026-03-15T11:55:00.000Z", now),
      "5m"
    );
  });

  it("returns hours under one day", () => {
    assert.equal(
      formatCompactRelativeTime("2026-03-15T10:00:00.000Z", now),
      "2h"
    );
  });

  it("returns days at or after one day", () => {
    assert.equal(
      formatCompactRelativeTime("2026-03-12T12:00:00.000Z", now),
      "3d"
    );
  });
});

describe("formatNotificationGroupLabel", () => {
  it("labels today and yesterday", () => {
    assert.equal(
      formatNotificationGroupLabel("2026-03-15", "2026-03-15"),
      "Today"
    );
    assert.equal(
      formatNotificationGroupLabel("2026-03-14", "2026-03-15"),
      "Yesterday"
    );
  });

  it("formats older dates as day + short month", () => {
    assert.equal(
      formatNotificationGroupLabel("2026-03-01", "2026-03-15"),
      "1 Mar"
    );
  });
});

describe("groupNotificationTasks", () => {
  it("groups by scheduled local date newest first", () => {
    const now = new Date(2026, 2, 15, 18, 0, 0);
    const today: DashboardTask = {
      ...baseTask,
      id: "today",
      createdAt: "2026-03-15T10:00:00.000Z",
      scheduledAt: new Date(2026, 2, 15, 12, 0, 0).toISOString(),
    };
    const yesterday: DashboardTask = {
      ...baseTask,
      id: "yesterday",
      createdAt: "2026-03-14T10:00:00.000Z",
      scheduledAt: new Date(2026, 2, 14, 12, 0, 0).toISOString(),
    };
    const completed: DashboardTask = {
      ...baseTask,
      id: "done",
      status: "completed",
      completedAt: "2026-03-15T11:00:00.000Z",
      scheduledAt: new Date(2026, 2, 15, 9, 0, 0).toISOString(),
    };

    const groups = groupNotificationTasks([yesterday, today, completed], now);

    assert.deepEqual(
      groups.map((group) => ({
        label: group.label,
        ids: group.tasks.map((task) => task.id),
      })),
      [
        { label: "Today", ids: ["today"] },
        { label: "Yesterday", ids: ["yesterday"] },
      ]
    );
  });
});
