import "server-only";
import { env } from "@/env";

/** Local process has `CLERK_SECRET_KEY` (Clerk Backend / `auth()`). */
export function hasClerkSecret(): boolean {
  return Boolean(env.CLERK_SECRET_KEY?.trim());
}

/** Local process has `SUPABASE_SERVICE_ROLE_KEY` (admin DB client). */
export function hasSupabaseServiceRole(): boolean {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Cloud **Clerk** mode: no local `CLERK_SECRET_KEY` → identity via Vercel `/api/me`.
 * Publishable-key Clerk UI still runs on desktop; secret `auth()` stays on cloud.
 */
export function isCloudClerkMode(): boolean {
  if (!env.BENDO_CLOUD_API_URL?.trim()) {
    return false;
  }
  if (hasClerkSecret()) {
    return false;
  }
  return true;
}

/**
 * Cloud **Supabase** mode: no local service role → privileged DB/API via Vercel.
 */
export function isCloudSupabaseMode(): boolean {
  if (!env.BENDO_CLOUD_API_URL?.trim()) {
    return false;
  }
  if (hasSupabaseServiceRole()) {
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
