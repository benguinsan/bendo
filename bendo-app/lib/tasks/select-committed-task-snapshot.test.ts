import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DashboardTask } from "@/lib/dashboard/task-types";

import { persistedTaskToDashboard, type PersistedTask } from "./persisted-task";
import { selectCommittedTaskSnapshot } from "./select-committed-task-snapshot";

function dashboardTask(
  overrides: Partial<DashboardTask> & Pick<DashboardTask, "id" | "updatedAt">
): DashboardTask {
  return {
    title: "Sample",
    description: "Desc",
    status: "pending",
    priority: "moderate",
    categoryId: null,
    categoryName: null,
    createdAt: "2026-11-09T08:00:00.000Z",
    scheduledAt: "2026-11-10T12:00:00.000Z",
    scheduledDate: "2026-11-10",
    completedAt: null,
    thumbnailSrc: "/dashboard/thumb-placeholder.svg",
    thumbnailAlt: "Task image",
    ...overrides,
  };
}

describe("selectCommittedTaskSnapshot", () => {
  it("lets a newer refresh replace an older PATCH snapshot", () => {
    // Arrival: PATCH first, then refresh. Revisions: refresh is newer.
    const patchSnapshot = dashboardTask({
      id: "task-1",
      priority: "extreme",
      title: "After vital PATCH",
      updatedAt: "2026-11-09T10:00:00.000Z",
    });
    const refreshSnapshot = dashboardTask({
      id: "task-1",
      priority: "extreme",
      title: "Server refresh after vital",
      description: "Also updated elsewhere",
      updatedAt: "2026-11-09T10:00:01.000Z",
    });

    assert.deepEqual(
      selectCommittedTaskSnapshot(patchSnapshot, refreshSnapshot),
      refreshSnapshot
    );
  });

  it("keeps a newer local edit when an older refresh arrives later", () => {
    // Arrival: edit reply first, then stale refresh. Revisions: local is newer.
    const localEdit = dashboardTask({
      id: "task-1",
      title: "Edited title",
      priority: "extreme",
      updatedAt: "2026-11-09T10:05:00.000Z",
    });
    const olderRefresh = dashboardTask({
      id: "task-1",
      title: "Stale title",
      priority: "moderate",
      updatedAt: "2026-11-09T10:00:00.000Z",
    });

    assert.deepEqual(
      selectCommittedTaskSnapshot(localEdit, olderRefresh),
      localEdit
    );
  });

  it("keeps a newer mutation when an older mutation reply arrives out of order", () => {
    // Arrival: status reply arrives after a later edit reply.
    const laterEdit = dashboardTask({
      id: "task-1",
      title: "Later edit",
      status: "pending",
      updatedAt: "2026-11-09T11:00:00.000Z",
    });
    const earlierStatus = dashboardTask({
      id: "task-1",
      title: "Before edit",
      status: "completed",
      completedAt: "2026-11-09T10:30:00.000Z",
      updatedAt: "2026-11-09T10:30:00.000Z",
    });

    assert.deepEqual(
      selectCommittedTaskSnapshot(laterEdit, earlierStatus),
      laterEdit
    );
  });

  it("keeps the current snapshot when updatedAt is equal (conservative)", () => {
    // Same revision stamp but overlapping fields differ — do not lose current values.
    const current = dashboardTask({
      id: "task-1",
      title: "Local overlapping edit",
      priority: "extreme",
      updatedAt: "2026-11-09T12:00:00.000Z",
    });
    const sameRevisionRefresh = dashboardTask({
      id: "task-1",
      title: "Refresh same stamp",
      priority: "moderate",
      description: "Nonconflicting-looking field",
      updatedAt: "2026-11-09T12:00:00.000Z",
    });

    assert.deepEqual(
      selectCommittedTaskSnapshot(current, sameRevisionRefresh),
      current
    );
  });

  it("replaces on task identity change even if incoming updatedAt is older", () => {
    const viewingA = dashboardTask({
      id: "task-a",
      title: "Task A",
      updatedAt: "2026-11-09T15:00:00.000Z",
    });
    const taskB = dashboardTask({
      id: "task-b",
      title: "Task B",
      updatedAt: "2026-11-09T09:00:00.000Z",
    });

    assert.deepEqual(selectCommittedTaskSnapshot(viewingA, taskB), taskB);
  });

  it("distinguishes arrival order from revision order across a refresh then late PATCH", () => {
    // Arrival: refresh first (newer stamp), then a late PATCH with an older stamp.
    const afterRefresh = selectCommittedTaskSnapshot(
      dashboardTask({
        id: "task-1",
        title: "PATCH snapshot",
        priority: "extreme",
        updatedAt: "2026-11-09T10:00:00.000Z",
      }),
      dashboardTask({
        id: "task-1",
        title: "Refresh newer",
        priority: "extreme",
        description: "From server read",
        updatedAt: "2026-11-09T10:00:05.000Z",
      })
    );
    const afterLatePatch = selectCommittedTaskSnapshot(
      afterRefresh,
      dashboardTask({
        id: "task-1",
        title: "Late PATCH",
        priority: "extreme",
        updatedAt: "2026-11-09T10:00:00.000Z",
      })
    );

    assert.equal(afterRefresh.title, "Refresh newer");
    assert.equal(afterRefresh.description, "From server read");
    assert.deepEqual(afterLatePatch, afterRefresh);
  });
});

describe("persistedTaskToDashboard updatedAt", () => {
  it("preserves the server updatedAt on the dashboard model", () => {
    const persisted: PersistedTask = {
      id: "task-1",
      title: "Sample",
      description: "Desc",
      status: "pending",
      priority: "moderate",
      categoryId: null,
      categoryName: null,
      scheduledAt: "2026-11-10T12:00:00.000Z",
      scheduledDate: "2026-11-10",
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-placeholder.svg",
      thumbnailAlt: "Task image",
      createdAt: "2026-11-09T08:00:00.000Z",
      updatedAt: "2026-11-09T09:30:00.000Z",
      isOverdue: false,
    };

    const dashboard = persistedTaskToDashboard(persisted);

    assert.equal(dashboard.updatedAt, "2026-11-09T09:30:00.000Z");
  });
});
