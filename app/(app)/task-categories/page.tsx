import type { Metadata } from "next";

import { StubPage } from "@/components/app-shell/stub-page";

export const metadata: Metadata = {
  title: "Task Categories · bendo",
};

export default function TaskCategoriesPage() {
  return <StubPage title="Task Categories" />;
}
