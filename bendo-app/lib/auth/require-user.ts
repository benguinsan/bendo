import { redirect } from "next/navigation";
import { cache } from "react";

import { type MeUser, resolveCurrentUserForApp } from "@/lib/api/cloud";

export type AppUser = MeUser;

/**
 * Authenticated user for RSC pages.
 * Local full secrets: Clerk `currentUser()`.
 * Cloud Clerk mode: Vercel `GET /api/me` (Clerk secret stays on cloud).
 */
export const requireUser = cache(async (): Promise<AppUser> => {
  const user = await resolveCurrentUserForApp();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
});
