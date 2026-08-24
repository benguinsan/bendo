import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";

export const metadata: Metadata = {
  title: "Calendar · bendo",
};

export default function CalendarPage() {
  return <StubPage title="Calendar" />;
}
