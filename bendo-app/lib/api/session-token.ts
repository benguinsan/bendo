import "server-only";
import { cookies } from "next/headers";

/**
 * Read Clerk session JWT from Authorization Bearer or `__session` cookie.
 * Does not verify locally — Vercel `auth()` verifies when the token is forwarded.
 */
export async function getForwardableSessionToken(
  request?: Request
): Promise<string | null> {
  const header = request?.headers.get("authorization");
  if (header) {
    const prefix = "bearer ";
    if (
      header.length > prefix.length &&
      header.toLowerCase().startsWith(prefix)
    ) {
      const token = header.slice(prefix.length).trim();
      if (token) {
        return token;
      }
    }
  }

  const jar = await cookies();
  return jar.get("__session")?.value?.trim() || null;
}
