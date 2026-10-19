import {
  browserApiFetch,
  type BrowserApiGetToken,
} from "@/lib/api/browser-api-fetch";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";

export type CategoryApiAuth = {
  getToken?: BrowserApiGetToken;
};

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
  name: string,
  auth?: CategoryApiAuth
): Promise<
  { ok: true; category: PersistedCategory } | { ok: false; error: string }
> {
  try {
    const response = await browserApiFetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      getToken: auth?.getToken,
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
  } catch {
    return { ok: false, error: "Could not create category." };
  }
}

export async function updateCategoryViaApi(
  input: {
    categoryId: string;
    name: string;
  },
  auth?: CategoryApiAuth
): Promise<
  { ok: true; category: PersistedCategory } | { ok: false; error: string }
> {
  try {
    const response = await browserApiFetch(
      `/api/categories/${input.categoryId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.name }),
        getToken: auth?.getToken,
      }
    );

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
  } catch {
    return { ok: false, error: "Could not update category." };
  }
}

export async function deleteCategoryViaApi(
  categoryId: string,
  auth?: CategoryApiAuth
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await browserApiFetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
      getToken: auth?.getToken,
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
  } catch {
    return { ok: false, error: "Could not delete category." };
  }
}

export async function listCategoriesViaApi(
  auth?: CategoryApiAuth
): Promise<
  { ok: true; categories: PersistedCategory[] } | { ok: false; error: string }
> {
  try {
    const response = await browserApiFetch("/api/categories", {
      getToken: auth?.getToken,
    });

    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { ok: false, error: "Could not load categories." };
      }

      const body = payload as ApiErrorBody;
      return { ok: false, error: body.error ?? "Could not load categories." };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: "Could not load categories." };
    }

    const body = payload as { data?: PersistedCategory[] };
    return { ok: true, categories: body.data ?? [] };
  } catch {
    return { ok: false, error: "Could not load categories." };
  }
}
