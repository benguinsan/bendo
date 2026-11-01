import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTaskApiSchema,
  scheduledAtFromDateInput,
  updateTaskApiSchema,
} from "./task-input";

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
