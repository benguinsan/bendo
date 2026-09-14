import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: ReactNode;
  /** Fill the main scroll area height (my-task / vital-task style). */
  variant?: "default" | "fill";
  className?: string;
};

export function PageFrame({
  children,
  variant = "default",
  className,
}: PageFrameProps) {
  return (
    <div
      className={cn(
        "flex flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        variant === "default" && "gap-6",
        variant === "fill" && "min-h-0 lg:h-full",
        className
      )}
    >
      {children}
    </div>
  );
}
