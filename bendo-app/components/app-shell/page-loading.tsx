import type { ReactNode } from "react";

import { PageFrame } from "@/components/app-shell/page-frame";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-muted/80 animate-pulse rounded-md", className)}
      aria-hidden
    />
  );
}

function PanelCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card shadow-panel bg-card flex min-h-0 flex-col gap-4 p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function TaskRowSkeleton() {
  return (
    <div className="rounded-card border-border/50 flex flex-col gap-3 border p-4">
      <Pulse className="h-4 w-2/5" />
      <div className="flex gap-4">
        <Pulse className="h-16 flex-1" />
        <Pulse className="h-16 w-20 shrink-0" />
      </div>
      <Pulse className="h-3 w-3/4" />
    </div>
  );
}

function DashboardLoading() {
  return (
    <PageFrame>
      <Pulse className="h-9 w-64 sm:h-10 sm:w-80" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Pulse className="h-5 w-24" />
            <Pulse className="h-5 w-20" />
          </div>
          <Pulse className="h-px w-full" />
          <Pulse className="h-4 w-40" />
          <div className="flex flex-col gap-3">
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </div>
        </section>
        <div className="flex flex-col gap-6">
          <PanelCard>
            <Pulse className="h-5 w-28" />
            <Pulse className="h-px w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Pulse className="mx-auto size-[100px] rounded-full" />
              <Pulse className="mx-auto size-[100px] rounded-full" />
              <Pulse className="mx-auto size-[100px] rounded-full" />
            </div>
          </PanelCard>
          <PanelCard>
            <Pulse className="h-5 w-36" />
            <Pulse className="h-px w-full" />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </PanelCard>
        </div>
      </div>
    </PageFrame>
  );
}

function SplitLoading() {
  return (
    <PageFrame variant="fill">
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[minmax(0,1fr)]">
        <PanelCard className="lg:h-full">
          <Pulse className="h-5 w-28" />
          <div className="flex flex-col gap-3">
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </div>
        </PanelCard>
        <PanelCard className="lg:h-full">
          <div className="flex gap-4">
            <Pulse className="size-40 shrink-0 rounded-lg sm:size-44" />
            <div className="flex flex-1 flex-col gap-2">
              <Pulse className="h-6 w-3/4" />
              <Pulse className="h-4 w-1/2" />
              <Pulse className="h-4 w-2/5" />
              <Pulse className="h-3 w-1/3" />
            </div>
          </div>
          <Pulse className="h-24 w-full" />
        </PanelCard>
      </div>
    </PageFrame>
  );
}

function FillCardLoading() {
  return (
    <PageFrame variant="fill">
      <PanelCard className="flex-1 lg:h-full">
        <div className="flex items-center justify-between gap-3">
          <Pulse className="h-5 w-36" />
          <Pulse className="h-4 w-16" />
        </div>
        <Pulse className="h-10 w-32" />
        <div className="flex flex-col gap-3">
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-full" />
          <Pulse className="h-10 w-3/4" />
        </div>
      </PanelCard>
    </PageFrame>
  );
}

function CalendarLoading() {
  return (
    <PageFrame>
      <PanelCard>
        <div className="mb-4 flex items-center justify-between">
          <Pulse className="h-6 w-40" />
          <div className="flex gap-2">
            <Pulse className="size-9" />
            <Pulse className="size-9" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <Pulse key={index} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </PanelCard>
      <PanelCard>
        <Pulse className="h-6 w-56" />
        <div className="flex flex-col gap-3">
          <TaskRowSkeleton />
          <TaskRowSkeleton />
        </div>
      </PanelCard>
    </PageFrame>
  );
}

function AgentLoading() {
  return (
    <div className="flex h-[calc(100svh-100px)] min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="bg-card shadow-panel rounded-card border-border/40 flex min-h-0 flex-1 flex-col gap-4 border px-4 py-4 sm:px-6 sm:py-5">
        <Pulse className="h-8 w-40" />
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Pulse className="h-16 w-3/4 rounded-xl" />
          <Pulse className="ml-auto h-16 w-2/3 rounded-xl" />
          <Pulse className="h-16 w-3/5 rounded-xl" />
        </div>
        <Pulse className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

type PageLoadingProps = {
  variant: "dashboard" | "split" | "fill-card" | "calendar" | "agent";
};

const loadingByVariant = {
  dashboard: DashboardLoading,
  split: SplitLoading,
  "fill-card": FillCardLoading,
  calendar: CalendarLoading,
  agent: AgentLoading,
} as const;

export function PageLoading({ variant }: PageLoadingProps) {
  const Body = loadingByVariant[variant];

  return (
    <output className="block w-full" aria-label="Loading">
      <span className="sr-only">Loading</span>
      <Body />
    </output>
  );
}
