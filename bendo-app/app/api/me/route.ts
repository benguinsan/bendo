import { currentUser } from "@clerk/nextjs/server";

import type { CloudMeUser } from "@/lib/api/cloud-auth";
import { maybeProxyPrivilegedRequest } from "@/lib/api/cloud-privilege";
import { requireApiUser } from "@/lib/api/require-api-user";
import { unauthorized } from "@/lib/api/respond";

/**
 * Session profile for desktop cloud privilege mode.
 * On Vercel (secrets present): auth() + currentUser().
 * On desktop without secrets: proxied to Vercel with Bearer session JWT.
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

  const data: CloudMeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    username: user.username,
    imageUrl: user.imageUrl,
    primaryEmailAddress: user.primaryEmailAddress
      ? { emailAddress: user.primaryEmailAddress.emailAddress }
      : null,
    externalAccounts: user.externalAccounts.map((account) => ({
      provider: account.provider,
      username: account.username,
      providerUserId: account.providerUserId,
      verification: account.verification
        ? { status: account.verification.status }
        : null,
    })),
  };

  return Response.json({ data });
}
