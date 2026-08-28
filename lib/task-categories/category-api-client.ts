import type { PersistedCategory } from "@/lib/task-categories/persisted-category";

type CategoryApiErrorCode =
  | "VALIDATION"
  | "DUPLICATE_CATEGORY"
  | "CATEGORY_NOT_FOUND"
  | "INTERNAL";

type ApiErrorBody = {
  error: string;
  code?: CategoryApiErrorCode;
};

type ApiSuccessBody = {
  data: PersistedCategory;
};

export async function createCategoryViaApi(
  name: string
): Promise<
  { ok: true; category: PersistedCategory } | { ok: false; error: string }
> {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "Could not create category." };
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody;
    return { ok: false, error: body.error ?? "Could not create category." };
  }

  const body = payload as ApiSuccessBody;
  return { ok: true, category: body.data };
}

export async function updateCategoryViaApi(input: {
  categoryId: string;
  name: string;
}): Promise<
  { ok: true; category: PersistedCategory } | { ok: false; error: string }
> {
  const response = await fetch(`/api/categories/${input.categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "Could not update category." };
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody;
    return { ok: false, error: body.error ?? "Could not update category." };
  }

  const body = payload as ApiSuccessBody;
  return { ok: true, category: body.data };
}

export async function deleteCategoryViaApi(
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });

  if (response.ok) {
    return { ok: true };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "Could not delete category." };
  }

  const body = payload as ApiErrorBody;
  return { ok: false, error: body.error ?? "Could not delete category." };
}

export async function listCategoriesViaApi(): Promise<PersistedCategory[]> {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    return [];
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return [];
  }

  const body = payload as { data?: PersistedCategory[] };
  return body.data ?? [];
}
