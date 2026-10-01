import "server-only";
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
