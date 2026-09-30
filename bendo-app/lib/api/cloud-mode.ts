import "server-only";
import { env } from "@/env";

export function hasClerkSecret(): boolean {
  return Boolean(env.CLERK_SECRET_KEY?.trim());
}

export function hasLocalSupabaseAdmin(): boolean {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** No local service role → privileged DB/API via Vercel. */
export function isCloudPrivilegeMode(): boolean {
  if (!env.BENDO_CLOUD_API_URL?.trim()) {
    return false;
  }
  if (hasLocalSupabaseAdmin()) {
    return false;
  }
  return true;
}

/**
 * No local CLERK_SECRET_KEY → session profile / userId via Vercel `/api/me`.
 * Publishable-key Clerk UI still runs on desktop; secret auth() stays on cloud.
 */
export function isCloudAuthMode(): boolean {
  if (!env.BENDO_CLOUD_API_URL?.trim()) {
    return false;
  }
  if (hasClerkSecret()) {
    return false;
  }
  return true;
}

export function getCloudApiOrigin(): string {
  const origin = env.BENDO_CLOUD_API_URL?.trim();
  if (!origin) {
    throw new Error("BENDO_CLOUD_API_URL is not configured.");
  }
  return origin.replace(/\/$/u, "");
}
