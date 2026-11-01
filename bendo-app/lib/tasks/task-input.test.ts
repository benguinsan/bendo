import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DashboardTask } from "@/lib/dashboard/task-types";

import {
  createTaskApiSchema,
  scheduledAtFromDateInput,
  toLocalDateKey,
  tzOffsetMinutesForDate,
  updateTaskApiSchema,
  validateUpdatedTask,
} from "./task-input";

function localDateOffset(now: Date, dayOffset: number): string {
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset
  );
  return toLocalDateKey(d);
}

function baseUpdateInput(overrides: {
  date: string;
  originalDate: string;
  status?: "pending" | "completed";
  now?: Date;
}) {
  const now = overrides.now ?? new Date();
  return {
    title: "Overdue task",
    date: overrides.date,
    originalDate: overrides.originalDate,
    priority: "low",
    description: "",
    now,
    existingTasks: [] as DashboardTask[],
    taskId: "task-1",
    status: overrides.status ?? ("pending" as const),
  };
}

describe("scheduledAtFromDateInput", () => {
  it("uses noon for a future date (offset 0)", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 10, 0));
    const result = scheduledAtFromDateInput("2026-03-16", now, 0);

    assert.equal(
      result,
      new Date(Date.UTC(2026, 2, 16, 12, 0, 0)).toISOString()
    );
  });

  it("uses noon when today is still before noon (offset 0)", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 9, 30));
    const result = scheduledAtFromDateInput("2026-03-15", now, 0);

    assert.equal(
      result,
      new Date(Date.UTC(2026, 2, 15, 12, 0, 0)).toISOString()
    );
  });

  it("uses now + 1 hour when today is after noon (offset 0)", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 14, 0));
    const result = scheduledAtFromDateInput("2026-03-15", now, 0);

    assert.equal(
      result,
      new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    );
  });

  it("clamps to end of day when now + 1 hour crosses midnight (offset 0)", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 23, 30));
    const result = scheduledAtFromDateInput("2026-03-15", now, 0);

    assert.equal(
      result,
      new Date(Date.UTC(2026, 2, 15, 23, 59, 59, 999)).toISOString()
    );
  });

  it("UTC+7 late evening today stays on that local day (not next-day 00:30)", () => {
    // Vietnam UTC+7: 2026-11-01 23:30 local = 16:30Z
    const now = new Date("2026-11-01T16:30:00.000Z");
    const result = scheduledAtFromDateInput("2026-11-01", now, -420);

    assert.equal(result, "2026-11-01T16:59:59.999Z");
    // 16:59:59.999Z = 23:59:59.999 local UTC+7
    const localMs = new Date(result).getTime() - -420 * 60_000;
    assert.equal(new Date(localMs).toISOString().slice(0, 10), "2026-11-01");
  });

  it("UTC-8 evening today yields scheduled_at after now on that local day", () => {
    // Pacific UTC-8: 2026-11-01 20:00 local = 2026-11-02 04:00Z
    const now = new Date("2026-11-02T04:00:00.000Z");
    const result = scheduledAtFromDateInput("2026-11-01", now, 480);
    const scheduled = new Date(result);

    assert.ok(scheduled.getTime() > now.getTime());
    const localMs = scheduled.getTime() - 480 * 60_000;
    assert.equal(new Date(localMs).toISOString().slice(0, 10), "2026-11-01");
  });

  it("UTC+7 future date uses local noon", () => {
    const now = new Date("2026-11-01T16:30:00.000Z");
    const result = scheduledAtFromDateInput("2026-11-05", now, -420);

    // Local noon UTC+7 = 05:00Z
    assert.equal(result, "2026-11-05T05:00:00.000Z");
  });

  it("omitted offset matches explicit 0", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 14, 0));
    assert.equal(
      scheduledAtFromDateInput("2026-03-15", now),
      scheduledAtFromDateInput("2026-03-15", now, 0)
    );
  });
});

describe("tzOffsetMinutesForDate", () => {
  it("returns the offset for the requested date under America/New_York DST", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      assert.equal(tzOffsetMinutesForDate("2026-07-01"), 240);
      assert.equal(tzOffsetMinutesForDate("2026-12-01"), 300);
      assert.equal(tzOffsetMinutesForDate("2026-11-01"), 300);
      assert.equal(tzOffsetMinutesForDate("2026-03-08"), 240);
      assert.equal(
        scheduledAtFromDateInput(
          "2026-12-01",
          new Date("2026-07-01T12:00:00Z"),
          tzOffsetMinutesForDate("2026-12-01")
        ),
        "2026-12-01T17:00:00.000Z"
      );
    } finally {
      if (previousTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previousTz;
      }
    }
  });
});

describe("tzOffsetMinutes API schema", () => {
  const createBase = {
    title: "Test",
    date: "2026-11-01",
    priority: "low" as const,
  };

  it("accepts a valid offset on create", () => {
    const parsed = createTaskApiSchema.safeParse({
      ...createBase,
      tzOffsetMinutes: -420,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects offset 841", () => {
    const create = createTaskApiSchema.safeParse({
      ...createBase,
      tzOffsetMinutes: 841,
    });
    assert.equal(create.success, false);

    const update = updateTaskApiSchema.safeParse({
      date: "2026-11-01",
      tzOffsetMinutes: 841,
    });
    assert.equal(update.success, false);
  });

  it("rejects non-integer offset", () => {
    const create = createTaskApiSchema.safeParse({
      ...createBase,
      tzOffsetMinutes: -420.5,
    });
    assert.equal(create.success, false);

    const update = updateTaskApiSchema.safeParse({
      date: "2026-11-01",
      tzOffsetMinutes: 1.25,
    });
    assert.equal(update.success, false);
  });
});

describe("validateUpdatedTask past-date rule", () => {
  it("allows incomplete task with past originalDate when date unchanged", () => {
    const now = new Date();
    const past = localDateOffset(now, -2);
    const result = validateUpdatedTask(
      baseUpdateInput({ date: past, originalDate: past, now })
    );

    assert.equal(result.success, true);
  });

  it("rejects incomplete task when date changes to another past day", () => {
    const now = new Date();
    const original = localDateOffset(now, -1);
    const otherPast = localDateOffset(now, -3);
    const result = validateUpdatedTask(
      baseUpdateInput({ date: otherPast, originalDate: original, now })
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.errors.date, "Choose today or a future date.");
    }
  });

  it("allows completed task with past date", () => {
    const now = new Date();
    const past = localDateOffset(now, -5);
    const result = validateUpdatedTask(
      baseUpdateInput({
        date: past,
        originalDate: past,
        status: "completed",
        now,
      })
    );

    assert.equal(result.success, true);
  });
});
