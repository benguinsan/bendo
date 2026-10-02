import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

import {
  type MeUser,
  parseMeSuccessBody,
  toMeUser,
} from "@/lib/api/cloud/me-user";
import { getCloudApiOrigin, isCloudClerkMode } from "@/lib/api/cloud/mode";
import { getForwardableSessionToken } from "@/lib/api/cloud/session-token";

/**
 * Resolve the signed-in user via Vercel `/api/me` (Clerk secret stays on cloud).
 */
export async function fetchCloudMe(request?: Request): Promise<MeUser | null> {
  if (!isCloudClerkMode()) {
    throw new Error("fetchCloudMe called outside cloud Clerk mode.");
  }

  const token = await getForwardableSessionToken(request);
  if (!token) {
    return null;
  }

  const response = await fetch(`${getCloudApiOrigin()}/api/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Cloud /api/me failed with HTTP ${response.status}`);
  }

  // Guard: do not `as MeSuccessBody` — HTML/plain text throws here with a clear
  // message; wrong JSON shape fails in parseMeSuccessBody (avoids undefined MeUser).
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Cloud /api/me returned non-JSON body (HTTP ${response.status}).`
    );
  }

  return parseMeSuccessBody(payload);
}

/** Local Clerk userId when secret exists; otherwise cloud `/api/me`. */
export async function resolveAuthedUserId(
  request?: Request
): Promise<string | null> {
  if (isCloudClerkMode()) {
    const me = await fetchCloudMe(request);
    return me?.id ?? null;
  }

  const { isAuthenticated, userId } = await auth();
  if (!(isAuthenticated && userId)) {
    return null;
  }
  return userId;
}

export async function resolveSessionTokenForCloud(
  request?: Request
): Promise<string | null> {
  if (isCloudClerkMode()) {
    return getForwardableSessionToken(request);
  }

  const { getToken } = await auth();
  return (await getToken()) ?? null;
}

export async function resolveCurrentUserForApp(): Promise<MeUser | null> {
  if (isCloudClerkMode()) {
    return fetchCloudMe();
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const user = await currentUser();
  if (!user) {
    return null;
  }

  return toMeUser(user);
}
