"use client";

import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-foreground max-w-md text-center text-sm">
        {error.message || "Something went wrong loading this page."}
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
