"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEARCH_DEBOUNCE_MS = 300;

const TASK_LIST_PATHS = new Set(["/", "/my-task", "/vital-task", "/calendar"]);

/**
 * Builds a pathname + query string for the task search `q` param.
 */
function buildSearchHref(
  pathname: string,
  currentParams: URLSearchParams,
  query: string,
  options?: { forceResultsPath?: boolean }
): string {
  const params = new URLSearchParams(currentParams.toString());
  const trimmed = query.trim();

  if (trimmed) {
    params.set("q", trimmed);
  } else {
    params.delete("q");
  }

  const targetPath =
    options?.forceResultsPath && !TASK_LIST_PATHS.has(pathname)
      ? "/my-task"
      : pathname;
  const qs = params.toString();

  return qs ? `${targetPath}?${qs}` : targetPath;
}

/**
 * Header task search — local draft updates immediately; URL `q` updates after debounce.
 * Submit applies immediately and routes to My Task when the current page has no task list.
 */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(urlQuery);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);
  const debounceTimeoutRef = useRef<number | null>(null);

  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    setDraft(urlQuery);
  }

  useEffect(() => {
    const trimmedDraft = draft.trim();
    const trimmedUrl = urlQuery.trim();

    if (trimmedDraft === trimmedUrl) {
      return;
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      debounceTimeoutRef.current = null;
      router.replace(buildSearchHref(pathname, searchParams, trimmedDraft), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [draft, pathname, router, searchParams, urlQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    router.push(
      buildSearchHref(pathname, searchParams, draft, {
        forceResultsPath: true,
      }),
      { scroll: false }
    );
  }

  return (
    <form
      className="bg-card shadow-panel flex h-9 w-full max-w-[36.25rem] overflow-hidden rounded-lg"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="task-search">
        Search your task
      </label>
      <Input
        id="task-search"
        name="q"
        value={draft}
        placeholder="Search your task here..."
        className="h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
      <Button type="submit" size="icon-lg" aria-label="Search tasks">
        <SearchIcon />
      </Button>
    </form>
  );
}

/**
 * Static placeholder matching HeaderSearch layout while search params hydrate.
 */
export function HeaderSearchFallback() {
  return (
    <div className="bg-card shadow-panel flex h-9 w-full max-w-[36.25rem] overflow-hidden rounded-lg">
      <div className="h-9 min-w-0 flex-1" aria-hidden />
      <div className="size-9 shrink-0" aria-hidden />
    </div>
  );
}
