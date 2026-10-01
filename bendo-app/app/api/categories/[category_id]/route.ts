import { maybeProxyPrivilegedRequest } from "@/lib/api/cloud";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import {
  deleteCategory,
  updateCategory,
} from "@/lib/task-categories/category-service";

type CategoryRouteContext = {
  params: Promise<{ category_id: string }>;
};

export async function PATCH(request: Request, context: CategoryRouteContext) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  const { category_id: categoryId } = await context.params;
  return fromServiceResult(
    await updateCategory(authResult.userId, categoryId, body.body)
  );
}

export async function DELETE(request: Request, context: CategoryRouteContext) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const { category_id: categoryId } = await context.params;
  return fromServiceResult(await deleteCategory(authResult.userId, categoryId));
}
