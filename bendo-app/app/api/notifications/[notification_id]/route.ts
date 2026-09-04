import { requireApiUser } from "@/lib/api/require-api-user";
import { fromServiceResult, unauthorized } from "@/lib/api/respond";
import { markNotificationRead } from "@/lib/notifications/notification-service";

type NotificationRouteContext = {
  params: Promise<{ notification_id: string }>;
};

export async function PATCH(
  _request: Request,
  context: NotificationRouteContext
) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const { notification_id: notificationId } = await context.params;
  return fromServiceResult(
    await markNotificationRead(authResult.userId, notificationId)
  );
}
