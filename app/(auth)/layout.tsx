import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center overflow-x-hidden px-4 py-8">
      <div className="flex w-full flex-col items-center gap-8">
        <Link
          href="/"
          className="text-[28px] leading-normal font-semibold sm:text-[32px]"
        >
          <span className="text-primary">
            Ben<span className="text-foreground">do</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
