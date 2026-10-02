import "server-only";
import { fetchCloudApi } from "@/lib/api/cloud/privilege";
import type { DiscordIdentity } from "@/lib/discord/discord-identity-service";
import { fail, ok, type ServiceResult } from "@/lib/supabase/errors";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";
import type { PersistedTask } from "@/lib/tasks/persisted-task";

type ApiListBody<T> = { data: T[] };
type ApiSingleBody<T> = { data: T };
type ApiErrorBody = { error: string; code?: string };

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function cloudListTasks(): Promise<PersistedTask[]> {
  const response = await fetchCloudApi("/api/tasks");
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new Error(body?.error ?? "Could not load tasks from cloud API.");
  }

  const body = payload as ApiListBody<PersistedTask>;
  return body.data;
}

export async function cloudGetTask(
  taskId: string
): Promise<PersistedTask | null> {
  const response = await fetchCloudApi(
    `/api/tasks/${encodeURIComponent(taskId)}`
  );
  const payload = await parseJsonResponse(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new Error(body?.error ?? "Could not load task from cloud API.");
  }

  const body = payload as ApiSingleBody<PersistedTask>;
  return body.data;
}

export async function cloudListCategories(): Promise<PersistedCategory[]> {
  const response = await fetchCloudApi("/api/categories");
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new Error(body?.error ?? "Could not load categories from cloud API.");
  }

  const body = payload as ApiListBody<PersistedCategory>;
  return body.data;
}

export async function cloudUpsertDiscordIdentity(
  discordUserId: string
): Promise<ServiceResult<DiscordIdentity>> {
  const response = await fetchCloudApi("/api/discord-identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discordUserId }),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    return fail("INTERNAL", body?.error ?? "Could not sync Discord identity.");
  }

  const body = payload as ApiSingleBody<DiscordIdentity>;
  return ok(body.data);
}

export async function cloudDeleteDiscordIdentity(): Promise<
  ServiceResult<{ deleted: boolean }>
> {
  const response = await fetchCloudApi("/api/discord-identity", {
    method: "DELETE",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    return fail(
      "INTERNAL",
      body?.error ?? "Could not remove Discord identity."
    );
  }

  const body = payload as ApiSingleBody<{ deleted: boolean }>;
  return ok(body.data);
}
