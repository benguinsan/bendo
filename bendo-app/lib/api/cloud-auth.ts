import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getCloudApiOrigin, isCloudAuthMode } from "@/lib/api/cloud-mode";
import { getForwardableSessionToken } from "@/lib/api/session-token";
import type { ClerkProfileSource } from "@/lib/auth/to-dashboard-profile";

export type CloudMeUser = ClerkProfileSource & {
  id: string;
  externalAccounts: {
    provider: string;
    username: string | null;
    providerUserId: string;
    verification: { status: string } | null;
  }[];
};

type MeSuccessBody = { data: CloudMeUser };

/**
 * Resolve the signed-in user via Vercel `/api/me` (Clerk secret stays on cloud).
 */
export async function fetchCloudMe(
  request?: Request
): Promise<CloudMeUser | null> {
  if (!isCloudAuthMode()) {
    throw new Error("fetchCloudMe called outside cloud auth mode.");
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

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // Vercel often returns HTML 200 /_not-found when /api/me is missing or
    // Clerk rewrote an invalid session — never parse as JSON (crashes the page).
    throw new Error(
      `Cloud /api/me returned non-JSON (HTTP ${response.status}). Deploy /api/me to Vercel and confirm CLERK_SECRET_KEY there.`
    );
  }

  let payload: MeSuccessBody;
  try {
    payload = (await response.json()) as MeSuccessBody;
  } catch {
    throw new Error(
      `Cloud /api/me returned invalid JSON (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(`Cloud /api/me failed with HTTP ${response.status}`);
  }

  if (!payload?.data?.id) {
    return null;
  }

  return payload.data;
}

/** Local Clerk userId when secret exists; otherwise cloud `/api/me`. */
export async function resolveAuthedUserId(
  request?: Request
): Promise<string | null> {
  if (isCloudAuthMode()) {
    const me = await fetchCloudMe(request);
    return me?.id ?? null;
  }

  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return null;
  }
  return userId;
}

export async function resolveSessionTokenForCloud(
  request?: Request
): Promise<string | null> {
  if (isCloudAuthMode()) {
    return getForwardableSessionToken(request);
  }

  const { getToken } = await auth();
  return (await getToken()) ?? null;
}

export async function resolveCurrentUserForApp(): Promise<CloudMeUser | null> {
  if (isCloudAuthMode()) {
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

  return {
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
}
