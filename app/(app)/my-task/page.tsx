import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";

export const metadata: Metadata = {
  title: "My Task · bendo",
};

export default function MyTaskPage() {
  return <StubPage title="My Task" />;
}
