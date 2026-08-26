import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Agent · bendo",
};

export default async function AgentPage() {
  await requireUser();
  return <StubPage title="Agent" />;
}
