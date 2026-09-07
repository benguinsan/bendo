import type { Metadata } from "next";

import { AgentView } from "@/components/agent/agent-view";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";

export const metadata: Metadata = {
  title: "Agent · bendo",
};

export default async function AgentPage() {
  const user = await requireUser();

  return <AgentView profile={toDashboardProfile(user)} />;
}
