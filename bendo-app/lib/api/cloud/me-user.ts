import "server-only";
import { z } from "zod";

import type { ClerkProfileSource } from "@/lib/auth/to-dashboard-profile";

// ********* ME USER TYPE ***********
export type MeUser = ClerkProfileSource & {
  id: string;
  externalAccounts: {
    provider: string;
    username: string | null;
    providerUserId: string;
    verification: { status: string } | null;
  }[];
};

/**
 * Runtime schema for the JSON body of cloud `GET /api/me`.
 * Used so we never cast blindly — a misconfigured Vercel host may return HTML,
 * an error page, or `{ }` without `data`, which would otherwise yield `undefined`
 * as a fake MeUser and look like a silent sign-in redirect loop.
 */
const meUserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  username: z.string().nullable(),
  imageUrl: z.string().min(1),
  primaryEmailAddress: z.object({ emailAddress: z.string().min(1) }).nullable(),
  externalAccounts: z.array(
    z.object({
      provider: z.string().min(1),
      username: z.string().nullable(),
      providerUserId: z.string().min(1),
      verification: z.object({ status: z.string().min(1) }).nullable(),
    })
  ),
});

const meSuccessBodySchema = z.object({
  data: meUserSchema,
});

/**
 * Validate `{ data: MeUser }` from cloud `/api/me` before callers use it.
 * Throws with a clear error instead of returning a partial/undefined profile.
 */
export function parseMeSuccessBody(payload: unknown): MeUser {
  const parsed = meSuccessBodySchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      "Cloud /api/me returned an unexpected body shape (expected { data: MeUser })."
    );
  }
  return parsed.data.data;
}

/** Clerk `currentUser()` shape needed to build `MeUser` (avoid coupling to full User type). */
type ClerkUserSource = ClerkProfileSource & {
  id: string;
  externalAccounts: {
    provider: string;
    username: string | null;
    providerUserId: string;
    verification: { status: string } | null;
  }[];
};

// ********* TO ME USER FUNCTION (from /api/me) ***********
export function toMeUser(user: ClerkUserSource): MeUser {
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
