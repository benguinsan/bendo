import { maybeProxyPrivilegedRequest } from "@/lib/api/cloud-privilege";
import { requireApiUser } from "@/lib/api/require-api-user";
import { fromServiceResult, unauthorized } from "@/lib/api/respond";
import { markNotificationRead } from "@/lib/notifications/notification-service";

type NotificationRouteContext = {
  params: Promise<{ notification_id: string }>;
};

export async function PATCH(
  request: Request,
  context: NotificationRouteContext
) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const { notification_id: notificationId } = await context.params;
  return fromServiceResult(
    await markNotificationRead(authResult.userId, notificationId)
  );
}
