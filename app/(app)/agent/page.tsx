import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";

export const metadata: Metadata = {
  title: "Agent · bendo",
};

export default function AgentPage() {
  return <StubPage title="Agent" />;
}
