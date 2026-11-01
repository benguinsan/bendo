import "server-only";
import { fetchCloudApi } from "@/lib/api/cloud/privilege";
import {
  type DiscordIdentityStatus,
  parseDiscordIdentityStatusBody,
} from "@/lib/auth/discord-connection";
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

/**
 * Cloud cutover: GET /api/discord-identity on Vercel (verify OAuth + sync mapping).
 */
export async function cloudGetDiscordIdentity(): Promise<DiscordIdentityStatus> {
  const response = await fetchCloudApi("/api/discord-identity");
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new Error(
      body?.error ?? "Could not load Discord identity from cloud API."
    );
  }

  return parseDiscordIdentityStatusBody(payload);
}
