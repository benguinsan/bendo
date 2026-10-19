"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useId, useRef, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { listCategoriesViaApi } from "@/lib/task-categories/category-api-client";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";
import { cn } from "@/lib/utils";

type TaskFormCategoryFieldProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

/** Category `<select>` for task forms; loads options via Clerk-authenticated API. */
export function TaskFormCategoryField({
  value,
  error,
  onChange,
}: TaskFormCategoryFieldProps) {
  const fieldId = useId();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  const [categories, setCategories] = useState<PersistedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    loadIdRef.current += 1;
    const loadId = loadIdRef.current;

    /** Fetch categories for the current auth state; ignore superseded load ids. */
    async function loadCategories() {
      setLoading(true);
      setLoadError(null);

      if (!isSignedIn) {
        if (loadId === loadIdRef.current) {
          setCategories([]);
          setLoadError("Sign in to load categories.");
          setLoading(false);
        }
        return;
      }

      try {
        // Packaged desktop proxies /api/categories → Vercel; Bearer from Clerk
        // client is more reliable than relying on __session alone.
        // Read getToken from a ref so Clerk's unstable function identity does
        // not re-trigger this effect and abort in-flight loads.
        const result = await listCategoriesViaApi({
          getToken: getTokenRef.current,
        });

        // Ignore superseded loads (Strict Mode remount / isSignedIn flicker).
        // A cancelled boolean used to discard a finished 200 while a later
        // attempt could fail — server log showed upstream=200, UI still errored.
        if (loadId !== loadIdRef.current) {
          return;
        }

        if (!result.ok) {
          setCategories([]);
          setLoadError(result.error);
          setLoading(false);
          return;
        }

        setCategories(result.categories);
        setLoadError(null);
      } catch {
        if (loadId === loadIdRef.current) {
          setCategories([]);
          setLoadError("Could not load categories.");
        }
      }

      if (loadId === loadIdRef.current) {
        setLoading(false);
      }
    }

    void loadCategories();
  }, [isLoaded, isSignedIn]);

  const fieldError = error ?? loadError ?? undefined;

  return (
    <Field data-invalid={fieldError ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>Category</FieldLabel>
      <select
        id={fieldId}
        name="categoryId"
        value={value}
        disabled={loading || Boolean(loadError)}
        aria-invalid={Boolean(fieldError)}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
        )}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <FieldError>{fieldError}</FieldError>
    </Field>
  );
}
