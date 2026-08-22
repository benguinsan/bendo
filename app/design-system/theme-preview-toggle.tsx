"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemePreviewToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const label = isDark ? "Preview light theme" : "Preview dark theme";

  return (
    <Button
      variant="outline"
      aria-label={label}
      aria-pressed={isDark}
      onClick={() => {
        document.documentElement.classList.toggle("dark");
        setIsDark(document.documentElement.classList.contains("dark"));
      }}
    >
      {label}
    </Button>
  );
}
