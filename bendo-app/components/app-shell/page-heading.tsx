import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeadingProps = {
  children: ReactNode;
  className?: string;
};

export function PageHeading({ children, className }: PageHeadingProps) {
  return (
    <h1
      className={cn(
        "text-foreground text-[28px] font-medium sm:text-[36px]",
        className
      )}
    >
      {children}
    </h1>
  );
}
