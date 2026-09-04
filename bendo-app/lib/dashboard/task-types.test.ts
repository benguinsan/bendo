import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getTaskDisplayStatus,
  getTaskStatusPercents,
  toTaskView,
  type DashboardTask,
} from "./task-types";

const baseTask: DashboardTask = {
  id: "task-1",
  title: "Sample task",
  description: "Description",
  status: "pending",
  priority: "moderate",
  categoryId: null,
  categoryName: null,
  createdAt: "2026-08-31T08:00:00.000Z",
  scheduledAt: "2026-08-31T12:00:00.000Z",
  completedAt: null,
  thumbnailSrc: "/dashboard/thumb-placeholder.svg",
  thumbnailAlt: "Task image",
};

describe("getTaskDisplayStatus", () => {
  it("returns pending before scheduledAt", () => {
    const now = new Date("2026-08-31T11:59:59.000Z");

    assert.equal(getTaskDisplayStatus(baseTask, now), "pending");
  });

  it("returns expired after scheduledAt for pending tasks", () => {
    const now = new Date("2026-08-31T12:00:01.000Z");

    assert.equal(getTaskDisplayStatus(baseTask, now), "expired");
  });

  it("returns completed regardless of schedule", () => {
    const completedTask: DashboardTask = {
      ...baseTask,
      status: "completed",
      completedAt: "2026-08-31T13:00:00.000Z",
    };
    const now = new Date("2026-08-31T14:00:00.000Z");

    assert.equal(getTaskDisplayStatus(completedTask, now), "completed");
  });
});

describe("mounted view time progression", () => {
  it("transitions display status from pending to expired when now advances", () => {
    const beforeDue = new Date("2026-08-31T11:00:00.000Z");
    const afterDue = new Date("2026-08-31T13:00:00.000Z");

    const beforeView = toTaskView(baseTask, beforeDue);
    const afterView = toTaskView(baseTask, afterDue);

    assert.equal(beforeView.displayStatus, "pending");
    assert.equal(afterView.displayStatus, "expired");
    assert.equal(beforeView.isOverdue, false);
    assert.equal(afterView.isOverdue, true);
  });

  it("shifts status percentages from pending to expired when now advances", () => {
    const tasks = [baseTask];
    const beforeDue = new Date("2026-08-31T11:00:00.000Z");
    const afterDue = new Date("2026-08-31T13:00:00.000Z");

    const beforePercents = getTaskStatusPercents(tasks, beforeDue);
    const afterPercents = getTaskStatusPercents(tasks, afterDue);

    assert.equal(beforePercents.pending, 100);
    assert.equal(beforePercents.expired, 0);
    assert.equal(afterPercents.pending, 0);
    assert.equal(afterPercents.expired, 100);
  });
});
