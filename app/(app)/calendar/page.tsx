import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Calendar · bendo",
};

export default async function CalendarPage() {
  await requireUser();
  return <StubPage title="Calendar" />;
}
