import { currentUser } from "@clerk/nextjs/server";

import { maybeProxyPrivilegedRequest, toMeUser } from "@/lib/api/cloud";
import { requireApiUser } from "@/lib/api/require-api-user";
import { unauthorized } from "@/lib/api/respond";

/**
 * Session profile for desktop cloud cutover.
 * Vercel (secrets): auth() + currentUser().
 * Packaged without secrets: proxied to Vercel with Bearer session JWT.
 */
export async function GET(request: Request) {
  const proxied = await maybeProxyPrivilegedRequest(request);
  if (proxied) {
    return proxied;
  }

  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const user = await currentUser();
  if (!user || user.id !== authResult.userId) {
    return unauthorized();
  }

  return Response.json({ data: toMeUser(user) });
}
