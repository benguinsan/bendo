import type { DashboardProfile } from "@/lib/dashboard/task-types";

export type ClerkProfileSource = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
};

function greetingName(user: ClerkProfileSource, email: string): string {
  const first = user.firstName?.trim();
  if (first) {
    return first;
  }

  const [local] = email.split("@");
  if (local) {
    return local;
  }

  return "there";
}

function initialsFrom(fullName: string, email: string): string {
  const parts = fullName.split(/\s+/u).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0];
    const last = parts.at(-1)?.[0];
    if (first && last) {
      return `${first}${last}`.toUpperCase();
    }
  }

  const single = parts[0]?.[0];
  if (single) {
    return single.toUpperCase();
  }

  const [fromEmail] = email;
  if (fromEmail) {
    return fromEmail.toUpperCase();
  }

  return "?";
}

export function toDashboardProfile(user: ClerkProfileSource): DashboardProfile {
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const joinedName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();
  const fullName =
    user.fullName?.trim() || joinedName || user.username?.trim() || email;
  const firstName = greetingName(user, email);

  return {
    firstName,
    fullName,
    email,
    avatarSrc: user.imageUrl,
    initials: initialsFrom(fullName, email),
  };
}
