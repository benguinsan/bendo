"use client";

import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  return (
    <form
      className="bg-card shadow-panel flex h-9 w-full max-w-[36.25rem] overflow-hidden rounded-lg"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label className="sr-only" htmlFor="task-search">
        Search your task
      </label>
      <Input
        id="task-search"
        name="q"
        placeholder="Search your task here..."
        className="h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="icon-lg" aria-label="Search tasks">
        <SearchIcon />
      </Button>
    </form>
  );
}
