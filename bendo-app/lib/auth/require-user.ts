import { redirect } from "next/navigation";
import { cache } from "react";

import {
  resolveCurrentUserForApp,
  type CloudMeUser,
} from "@/lib/api/cloud-auth";

export type AppUser = CloudMeUser;

/**
 * Authenticated user for RSC pages.
 * Local full secrets: Clerk `currentUser()`.
 * Cloud privilege mode: Vercel `GET /api/me` (Clerk secret stays on cloud).
 */
export const requireUser = cache(async (): Promise<AppUser> => {
  const user = await resolveCurrentUserForApp();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
});
