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

export default function Loading() {
  return (
    <output className="block w-full" aria-label="Loading">
      <span className="sr-only">Loading</span>
      <PageFrame>
        <Pulse className="h-9 w-40 sm:h-10 sm:w-48" />
        <div className="flex max-w-xl flex-col gap-6">
          <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
            <Pulse className="h-5 w-24" />
            <Pulse className="h-4 w-48" />
            <Pulse className="h-4 w-36" />
            <Pulse className="h-4 w-56" />
          </div>
          <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
            <Pulse className="h-5 w-28" />
            <Pulse className="h-4 w-full max-w-sm" />
            <div className="flex items-center justify-between gap-3">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-8 w-36" />
            </div>
          </div>
        </div>
      </PageFrame>
    </output>
  );
}
