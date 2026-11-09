import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { updateTaskPriorityViaApi } from "./task-api-client";
import { updateTaskApiSchema } from "./task-input";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function mockFetch(handler: (call: FetchCall) => Response): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: requestUrl(input), init };
    calls.push(call);
    return Promise.resolve(handler(call));
  }) as typeof fetch;
  return calls;
}

const persistedTask = {
  id: "task-1",
  title: "Sample",
  description: "Desc",
  status: "pending" as const,
  priority: "extreme" as const,
  categoryId: null,
  categoryName: null,
  createdAt: "2026-11-09T08:00:00.000Z",
  scheduledAt: "2026-11-10T12:00:00.000Z",
  scheduledDate: "2026-11-10",
  completedAt: null,
  thumbnailSrc: "/dashboard/thumb-placeholder.svg",
  thumbnailAlt: "Task image",
};

describe("updateTaskPriorityViaApi", () => {
  it("PATCHes only priority and returns the updated task", async () => {
    const calls = mockFetch(() =>
      Response.json({ data: persistedTask }, { status: 200 })
    );

    const result = await updateTaskPriorityViaApi("task-1", "extreme");

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.task.priority, "extreme");
    assert.equal(result.task.id, "task-1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "/api/tasks/task-1");
    assert.equal(calls[0]?.init?.method, "PATCH");
    assert.equal(
      calls[0]?.init?.headers &&
        (calls[0].init.headers as Record<string, string>)["Content-Type"],
      "application/json"
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      priority: "extreme",
    });
  });

  it("returns a readable error without inventing a task on failure", async () => {
    mockFetch(() =>
      Response.json(
        { error: "Could not update task priority.", code: "INTERNAL" },
        { status: 500 }
      )
    );

    const result = await updateTaskPriorityViaApi("task-1", "extreme");

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error, "Could not update task priority.");
    assert.equal("task" in result, false);
  });

  it("accepts priority-only payloads in the update schema", () => {
    const parsed = updateTaskApiSchema.safeParse({ priority: "extreme" });
    assert.equal(parsed.success, true);
  });
});
