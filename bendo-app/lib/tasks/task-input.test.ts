import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scheduledAtFromDateInput } from "./task-input";

describe("scheduledAtFromDateInput", () => {
  it("uses noon for a future date", () => {
    const now = new Date(2026, 2, 15, 10, 0);
    const result = scheduledAtFromDateInput("2026-03-16", now);

    assert.equal(result, new Date(2026, 2, 16, 12, 0, 0).toISOString());
  });

  it("uses noon when today is still before noon", () => {
    const now = new Date(2026, 2, 15, 9, 30);
    const result = scheduledAtFromDateInput("2026-03-15", now);

    assert.equal(result, new Date(2026, 2, 15, 12, 0, 0).toISOString());
  });

  it("uses now + 1 hour when today is after noon", () => {
    const now = new Date(2026, 2, 15, 14, 0);
    const result = scheduledAtFromDateInput("2026-03-15", now);

    assert.equal(
      result,
      new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    );
  });

  it("clamps to end of day when now + 1 hour crosses midnight", () => {
    const now = new Date(2026, 2, 15, 23, 30);
    const result = scheduledAtFromDateInput("2026-03-15", now);

    assert.equal(result, new Date(2026, 2, 15, 23, 59, 59, 999).toISOString());
  });
});
