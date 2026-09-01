import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth/require-user";
import { loadUserTasks } from "@/lib/tasks/load-tasks";

export const metadata: Metadata = {
  title: "Calendar · bendo",
};

export default async function CalendarPage() {
  const user = await requireUser();
  const now = new Date();
  const tasks = await loadUserTasks(user.id);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <CalendarView initialTasks={tasks} nowIso={now.toISOString()} />
    </div>
  );
}
