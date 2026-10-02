import { maybeProxyPrivilegedRequest } from "@/lib/api/cloud";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import {
  createNotification,
  listNotifications,
} from "@/lib/notifications/notification-service";

export async function GET(request: Request) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  return fromServiceResult(await listNotifications(authResult.userId));
}

export async function POST(request: Request) {
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

  return fromServiceResult(
    await createNotification(authResult.userId, body.body),
    true
  );
}
