import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/auth/require-user";
import { toDashboardProfile } from "@/lib/auth/to-dashboard-profile";
import { formatTodoDateLine } from "@/lib/dashboard/dates";
import { getMockTasks } from "@/lib/dashboard/mock-data";

export const metadata: Metadata = {
  title: "Dashboard · Bendo",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const { firstName } = toDashboardProfile(user);
  const now = new Date();
  const tasks = getMockTasks(now);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-foreground text-[28px] font-medium sm:text-[36px]">
        Welcome back, {firstName} 👋
      </h1>
      <DashboardView
        dateLine={formatTodoDateLine(now)}
        initialTasks={tasks}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
