import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";

export const metadata: Metadata = {
  title: "Vital Task · bendo",
};

export default function VitalTaskPage() {
  return <StubPage title="Vital Task" />;
}
