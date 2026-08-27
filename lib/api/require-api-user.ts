import "server-only";
import { auth } from "@clerk/nextjs/server";

export async function requireApiUser() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return { ok: false as const };
  }

  return { ok: true as const, userId };
}
